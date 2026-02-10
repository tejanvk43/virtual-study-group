import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Card,
  CardContent,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Send,
  SmartToy,
  School,
  Quiz,
  Psychology,
  Assignment,
  TrendingUp,
  Lightbulb,
  MenuBook,
  Science,
  Calculate,
  Code,
  Language,
  History,
  ExpandMore,
  Download,
  Share,
  Bookmark,
  ThumbUp,
  ThumbDown,
  Refresh,
  Clear,
  AttachFile,
  Image,
  VolumeUp,
  VideoCall,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type: 'text' | 'quiz' | 'explanation' | 'summary';
  metadata?: any;
}

interface StudyTopic {
  id: string;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
  lastStudied?: Date;
}

const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [explanationDialogOpen, setExplanationDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Real conversation history - would be loaded from API
  const [conversationHistory, setConversationHistory] = useState([]);

  // Real study topics - would be loaded from API
  const [studyTopics] = useState<StudyTopic[]>([]);

  const subjects = [
    { name: 'Programming', icon: <Code />, color: '#2196f3' },
    { name: 'Mathematics', icon: <Calculate />, color: '#ff9800' },
    { name: 'Science', icon: <Science />, color: '#4caf50' },
    { name: 'Language', icon: <Language />, color: '#9c27b0' },
    { name: 'General', icon: <School />, color: '#607d8b' },
  ];

  const quickActions = [
    { 
      title: 'Explain Concept', 
      description: 'Get detailed explanations on any topic',
      icon: <Psychology />,
      action: () => setExplanationDialogOpen(true)
    },
    { 
      title: 'Generate Quiz', 
      description: 'Create practice questions to test knowledge',
      icon: <Quiz />,
      action: () => setQuizDialogOpen(true)
    },
    { 
      title: 'Study Plan', 
      description: 'Get personalized study recommendations',
      icon: <Assignment />,
      action: () => handleQuickPrompt('Create a study plan for my current topics')
    },
    { 
      title: 'Start Study Call', 
      description: 'Begin a focused study session with video',
      icon: <VideoCall />,
      action: () => handleStartStudyCall()
    },
  ];

  // Load conversation history from API if available
  useEffect(() => {
    // Messages will be populated when user starts chatting
    // No dummy welcome message - keep it clean and professional
    setMessages([]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const responseContent = await generateAIResponse(message);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    setMessage(prompt);
    setTimeout(() => {
      const form = document.getElementById('message-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit', { bubbles: true }));
    }, 100);
  };

  const handleExplainConcept = async (concept: string) => {
    if (!concept.trim()) {
      toast.error('Please enter a concept to explain');
      return;
    }

    setLoading(true);
    try {
      console.log('💡 Requesting explanation for:', concept);
      const response = await aiAPI.explainConcept(concept, undefined, 'high');
      
      console.log('✅ Explanation received:', response.data);
      
      const explanationMessage: ChatMessage = {
        id: Date.now().toString(),
        content: response.data.explanation || 'Unable to generate explanation',
        role: 'assistant',
        timestamp: new Date(),
        type: 'explanation',
      };
      
      setMessages(prev => [...prev, explanationMessage]);
      toast.success('Explanation generated!');
    } catch (error: any) {
      console.error('❌ Error generating explanation:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || '';
      if (errorMsg.includes('QUOTA_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota')) {
        toast.error('AI daily quota exhausted. Resets tomorrow or use a new API key.');
      } else {
        toast.error(`Explanation failed: ${errorMsg || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setExplanationDialogOpen(false);
      setSelectedTopic('');
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      console.log('🤖 Sending message to AI:', userMessage);
      const response = await aiAPI.studyAssistant(userMessage, 'default', 'Personal study session with AI assistant');
      
      console.log('✅ AI response received:', response.data);
      
      return response.data.response || "I'm here to help! Could you provide more details about what you'd like to learn?";
    } catch (error: any) {
      console.error('❌ AI API error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || '';
      
      if (errorMsg.includes('QUOTA_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota')) {
        return "⚠️ The AI service has reached its daily free-tier usage limit. The quota resets tomorrow. To fix this immediately, you can:\n\n1. Get a new Gemini API key from https://ai.google.dev\n2. Or upgrade to a paid plan for higher limits\n\nPlease update the GEMINI_API_KEY in the backend .env file.";
      }
      if (error.response?.status === 503) {
        return "⚠️ AI service is not configured. Please add a GEMINI_API_KEY to the backend .env file.";
      }
      if (error.response?.status === 401) {
        return "⚠️ Authentication error. Please log in again.";
      }
      
      return `⚠️ AI service error: ${errorMsg || 'Unknown error'}. Please try again later.`;
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedTopic.trim()) {
      toast.error('Please enter a topic for the quiz');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Generating quiz for topic:', selectedTopic);
      const response = await aiAPI.generateQuiz(selectedTopic, 5, 'medium', 'multiple-choice');
      
      console.log('✅ Quiz response received:', response.data);
      
      // Handle both response structures: { questions: [...] } or { questions: [...], ... }
      const questions = response.data.questions || response.data;
      
      if (!questions || !Array.isArray(questions)) {
        console.error('❌ Invalid quiz response structure:', response.data);
        toast.error('Invalid quiz format received from server');
        return;
      }

      const quizMessage: ChatMessage = {
        id: Date.now().toString(),
        content: 'Here are your quiz questions:',
        role: 'assistant',
        timestamp: new Date(),
        type: 'quiz',
        metadata: { topic: selectedTopic, questions: questions }
      };
      
      setMessages(prev => [...prev, quizMessage]);
      toast.success('Quiz generated successfully!');
    } catch (error: any) {
      console.error('❌ Error generating quiz:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || '';
      if (errorMsg.includes('QUOTA_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota')) {
        toast.error('AI daily quota exhausted. Resets tomorrow or use a new API key.');
      } else {
        toast.error(`Quiz generation failed: ${errorMsg || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setQuizDialogOpen(false);
      setSelectedTopic('');
    }
  };

  const handleStartStudyCall = async () => {
    try {
      // Get the token correctly
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        try {
          const parsedAuth = JSON.parse(authStorage);
          token = parsedAuth.state?.token || '';
        } catch (error) {
          console.error('Error parsing auth token:', error);
        }
      }

      // Create a personal study session for AI-assisted learning
      const studySession = {
        title: 'AI Study Session',
        description: 'Personal study session with AI assistance',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        isRecurring: false
      };

      // Use dynamic API URL for network access
      const { getApiBaseUrl } = await import('../services/api');
      const apiBaseUrl = getApiBaseUrl();
      
      const response = await fetch(`${apiBaseUrl}/study-sessions/personal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studySession)
      });

      if (response.ok) {
        const session = await response.json();
        toast.success('Study call started!');
        // Navigate to the study session
        navigate(`/sessions/${session._id}`);
      } else {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error('Failed to start study call');
      }
    } catch (error: any) {
      console.error('Error starting study call:', error);
      toast.error('Failed to start study call. Please try again.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getSubjectIcon = (subject: string) => {
    const subjectData = subjects.find(s => s.name === subject);
    return subjectData?.icon || <School />;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return format(timestamp, 'MMM dd');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="h6" component="h1">
                AI Study Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your personal learning companion powered by AI
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Clear Chat">
              <IconButton onClick={() => setMessages([])}>
                <Clear />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Chat">
              <IconButton>
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
            <List sx={{ width: '100%' }}>
              {messages.map((msg) => (
                <ListItem 
                  key={msg.id} 
                  alignItems="flex-start"
                  sx={{ 
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    mb: 2
                  }}
                >
                  <ListItemAvatar sx={{ 
                    minWidth: 'auto', 
                    mx: 1,
                    order: msg.role === 'user' ? 1 : 0
                  }}>
                    <Avatar sx={{ 
                      bgcolor: msg.role === 'user' ? 'secondary.main' : 'primary.main',
                      width: 40,
                      height: 40
                    }}>
                      {msg.role === 'user' ? user?.firstName?.[0] : <SmartToy />}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '75%',
                      bgcolor: msg.role === 'user' ? 'secondary.light' : 'background.paper',
                      borderRadius: 2,
                    }}
                  >
                    {msg.type === 'quiz' && msg.metadata ? (
                      <Box>
                        <Typography variant="h6" gutterBottom color="primary">
                          Quiz: {msg.metadata.topic}
                        </Typography>
                        {msg.metadata.questions && msg.metadata.questions.map((q: any, index: number) => (
                          <Accordion key={index}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Typography variant="subtitle1">
                                Question {index + 1}: {q.question}
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box>
                                {q.options && q.options.map((option: string, optIndex: number) => (
                                  <Button
                                    key={optIndex}
                                    variant={option === q.correct_answer ? "contained" : "outlined"}
                                    color={option === q.correct_answer ? "success" : "inherit"}
                                    fullWidth
                                    sx={{ mb: 1, justifyContent: 'flex-start', textAlign: 'left' }}
                                  >
                                    {option}
                                  </Button>
                                ))}
                                {q.explanation && (
                                  <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                                    <strong>Explanation:</strong> {q.explanation}
                                  </Typography>
                                )}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    ) : (
                      <>
                        <Typography variant="body1" paragraph>
                          {msg.content}
                        </Typography>
                        
                        {msg.role === 'assistant' && (
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Good response">
                                <IconButton size="small">
                                  <ThumbUp fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Poor response">
                                <IconButton size="small">
                                  <ThumbDown fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Save response">
                                <IconButton size="small">
                                  <Bookmark fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(msg.timestamp)}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                </ListItem>
              ))}
              
              {loading && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SmartToy />
                    </Avatar>
                  </ListItemAvatar>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        AI is thinking...
                      </Typography>
                    </Box>
                  </Paper>
                </ListItem>
              )}
              
              <div ref={messagesEndRef} />
            </List>
            
            {/* Empty State Message */}
            {messages.length === 0 && !loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, p: 4 }}>
                <SmartToy sx={{ fontSize: 80, color: 'primary.main', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  Welcome to AI Study Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Ask me questions about any topic, or use the quick actions on the right to get started.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Message Input */}
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              borderRadius: 0,
              borderTop: 1,
              borderColor: 'divider',
              flexShrink: 0
            }}
          >
            <Box component="form" id="message-form" onSubmit={handleSendMessage} display="flex" gap={1} alignItems="flex-end">
              <IconButton size="small" disabled>
                <AttachFile />
              </IconButton>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask me anything about your studies..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                size="small"
                multiline
                maxRows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton size="small" disabled>
                <VolumeUp />
              </IconButton>
              <IconButton 
                type="submit" 
                color="primary"
                disabled={!message.trim() || loading}
              >
                <Send />
              </IconButton>
            </Box>
          </Paper>
        </Box>

        {/* Sidebar */}
        <Paper 
          elevation={1} 
          sx={{ 
            width: 320, 
            borderRadius: 0,
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
          >
            <Tab label="Quick Actions" />
            <Tab label="Topics" />
            <Tab label="History" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Quick Actions Tab */}
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  {quickActions.map((action, index) => (
                    <Grid item xs={12} key={index}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={action.action}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {action.icon}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {action.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {action.description}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Study Subjects
                </Typography>
                <List dense>
                  {subjects.map((subject) => (
                    <ListItem 
                      key={subject.name}
                      button
                      onClick={() => handleQuickPrompt(`I want to study ${subject.name}`)}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: subject.color,
                            width: 32,
                            height: 32
                          }}
                        >
                          {subject.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={subject.name} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Study Topics Tab */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Study Topics
                </Typography>
                {studyTopics.length > 0 ? (
                  <List>
                    {studyTopics.map((topic) => (
                      <ListItem key={topic.id} divider>
                        <Box width="100%">
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {topic.title}
                            </Typography>
                            <Chip 
                              size="small"
                              label={topic.difficulty}
                              color={getDifficultyColor(topic.difficulty)}
                            />
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            {getSubjectIcon(topic.subject)}
                            <Typography variant="caption" color="text.secondary">
                              {topic.subject}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LinearProgress 
                              variant="determinate" 
                              value={topic.progress} 
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">
                              {topic.progress}%                            </Typography>
                          </Box>
                          
                          {topic.lastStudied && (
                            <Typography variant="caption" color="text.secondary">
                              Last studied: {formatTimestamp(topic.lastStudied)}
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <School sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Study Topics Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start studying to track your progress across different topics!
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Conversation History Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Recent Conversations
                </Typography>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Psychology sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Conversation History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start a conversation with the AI assistant to see your chat history here.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Generate Quiz Dialog */}
      <Dialog open={quizDialogOpen} onClose={() => setQuizDialogOpen(false)}>
        <DialogTitle>Generate Quiz</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Topic"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            margin="normal"
            placeholder="Enter the topic you want to be quizzed on..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuizDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateQuiz} 
            variant="contained"
            disabled={loading || !selectedTopic.trim()}
          >
            {loading ? 'Generating...' : 'Generate Quiz'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Explanation Dialog */}
      <Dialog open={explanationDialogOpen} onClose={() => setExplanationDialogOpen(false)}>
        <DialogTitle>Request Explanation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="What would you like me to explain?"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder="Enter a concept, problem, or topic you'd like explained..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExplanationDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleExplainConcept(selectedTopic)} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Get Explanation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIAssistant;
