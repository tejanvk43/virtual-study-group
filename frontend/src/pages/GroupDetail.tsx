import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Badge,
} from '@mui/material';
import {
  Send,
  MoreVert,
  PersonAdd,
  ExitToApp,
  VideoCall,
  Public,
  Lock,
  Group,
  Reply,
  EmojiEmotions,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../contexts/SocketContext';
import { groupsAPI, messagesAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  type: 'text' | 'file' | 'system' | 'ai-response';
  group: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  fileName?: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  edited: {
    isEdited: boolean;
    editedAt?: string;
  };
}

interface GroupMember {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;
}

interface GroupData {
  _id: string;
  name: string;
  description?: string;
  subject: string;
  category: string;
  privacy: 'public' | 'private' | 'invite-only';
  maxMembers: number;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  members: GroupMember[];
  stats: {
    totalSessions: number;
    totalStudyTime: number;
    messagesCount: number;
  };
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

const GroupDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    // Join the group room for real-time updates
    if (socket && id && user) {
      console.log('Joining group room:', id, 'User:', user._id);
      socket.emit('join-group', { groupId: id, userId: user._id });
      
      // Listen for new messages
      socket.on('new-message', (newMessage: Message) => {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      });

      // Listen for session start
      socket.on('session-started', (sessionData: any) => {
        console.log('Received session-started event:', sessionData, 'Current group ID:', id);
        if (sessionData.groupId === id) {
          console.log('Setting active session:', sessionData);
          setActiveSession(sessionData);
          toast.success(`Study session "${sessionData.title}" has started!`, {
            duration: 5000,
            icon: '📹'
          });
        } else {
          console.log('Session group ID does not match current group. Session group:', sessionData.groupId, 'Current group:', id);
        }
      });

      // Listen for session end
      socket.on('session-ended', (sessionData: any) => {
        if (sessionData.groupId === id || activeSession?._id === sessionData._id) {
          setActiveSession(null);
          toast('Study session has ended', {
            icon: '🔴'
          });
        }
      });

      return () => {
        socket.emit('leave-group', { groupId: id, userId: user._id });
        socket.off('new-message');
        socket.off('session-started');
        socket.off('session-ended');
      };
    }
  }, [socket, id, user, activeSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchGroupData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getGroupById(id!);
      setGroup(response.data);
    } catch (error: any) {
      console.error('Error fetching group:', error);
      if (error.response?.status === 404) {
        toast.error('Group not found');
        navigate('/groups');
      } else if (error.response?.status === 403) {
        toast.error('Access denied');
        navigate('/groups');
      } else {
        toast.error('Failed to load group');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchMessages = useCallback(async () => {
    try {
      setMessagesLoading(true);
      const response = await messagesAPI.getGroupMessages(id!, { limit: 50 });
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, [id]);

  const checkActiveSession = useCallback(async () => {
    try {
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

      // Fetch upcoming sessions for this group
      // Use dynamic API URL for network access
      const { getApiBaseUrl } = await import('../services/api');
      const apiBaseUrl = getApiBaseUrl();
      
      const response = await fetch(`${apiBaseUrl}/study-sessions/upcoming?groupId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const sessions = await response.json();
        console.log('Fetched sessions for active check:', sessions);
        console.log('Current group ID:', id);
        // Check if there's a live session for this group
        const liveSession = sessions.find((s: any) => {
          console.log('Checking session:', s._id, 'Status:', s.status, 'Group:', s.group);
          return s.status === 'live' && s.group?._id === id;
        });
        console.log('Found live session:', liveSession);
        if (liveSession) {
          setActiveSession(liveSession);
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  }, [id]);

  // Effect to load initial data
  useEffect(() => {
    if (id) {
      fetchGroupData();
      fetchMessages();
      checkActiveSession();
    }
  }, [id, fetchGroupData, fetchMessages, checkActiveSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !id || sendingMessage) return;

    const messageData = {
      content: message.trim(),
      groupId: id,
      type: 'text' as const,
      replyTo: replyingTo?._id,
    };

    try {
      setSendingMessage(true);
      const response = await messagesAPI.sendMessage(messageData);
      
      // Emit to socket for real-time updates
      if (socket) {
        socket.emit('send-message', {
          ...response.data,
          groupId: id,
        });
      }

      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!id || !group) return;

    try {
      await groupsAPI.leaveGroup(id);
      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleStartCall = async () => {
    if (!id || !group) return;

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

      // Create an instant study session for the group call
      const callSession = {
        title: `${group.name} - Video Call`,
        description: `Instant video call for ${group.name}`,
        scheduledStart: new Date().toISOString(),
        scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        groupId: id,
        type: 'study'
      };

      // Use dynamic API URL for network access
      const { getApiBaseUrl } = await import('../services/api');
      const apiBaseUrl = getApiBaseUrl();
      
      const response = await fetch(`${apiBaseUrl}/study-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(callSession)
      });

      if (response.ok) {
        const session = await response.json();
        toast.success('Video call started!');
        // Navigate to the video call session
        navigate(`/sessions/${session._id}`);
      } else {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error('Failed to start call');
      }
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error('Failed to start video call. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public': return <Public fontSize="small" />;
      case 'private': return <Lock fontSize="small" />;
      default: return <Group fontSize="small" />;
    }
  };

  const isUserMember = () => {
    return group?.members.some(member => member.user._id === user?._id);
  };

  const getUserRole = () => {
    return group?.members.find(member => member.user._id === user?._id)?.role;
  };

  const MessageItem = ({ msg }: { msg: Message }) => (
    <ListItem
      alignItems="flex-start"
      sx={{ 
        py: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        }
      }}
    >
      <ListItemAvatar>
        <Avatar src={msg.sender?.avatar || undefined}>
          {msg.sender?.firstName?.[0] || '?'}{msg.sender?.lastName?.[0] || ''}
        </Avatar>
      </ListItemAvatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2" component="span">
            {msg.sender?.firstName || 'Unknown'} {msg.sender?.lastName || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(msg.createdAt), 'HH:mm')}
          </Typography>
          {msg.edited.isEdited && (
            <Chip label="edited" size="small" variant="outlined" />
          )}
        </Box>
        
        {msg.replyTo && (
          <Box
            sx={{
              pl: 2,
              borderLeft: 2,
              borderColor: 'primary.main',
              mb: 1,
              backgroundColor: 'action.selected',
              borderRadius: 1,
              p: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Replying to {msg.replyTo.sender?.firstName || 'Unknown User'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {msg.replyTo.content && msg.replyTo.content.length > 100 
                ? `${msg.replyTo.content.substring(0, 100)}...`
                : msg.replyTo.content || 'No content'
              }
            </Typography>
          </Box>
        )}
        
        <Typography variant="body1" component="div">
          {msg.content}
        </Typography>
        
        {msg.reactions.length > 0 && (
          <Box display="flex" gap={0.5} mt={1}>
            {msg.reactions.map((reaction, index) => (
              <Chip
                key={index}
                label={`${reaction.emoji} 1`}
                size="small"
                variant="outlined"
                onClick={() => {/* Handle reaction toggle */}}
              />
            ))}
          </Box>
        )}
      </Box>
      
      <Box>
        <IconButton
          size="small"
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setSelectedMessage(msg);
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>
    </ListItem>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!group) {
    return (
      <Box p={3}>
        <Alert severity="error">Group not found or access denied.</Alert>
      </Box>
    );
  }

  if (!isUserMember()) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          You are not a member of this group.
          <Button 
            onClick={() => navigate('/groups')}
            sx={{ ml: 2 }}
          >
            Browse Groups
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 56, height: 56 }}>
              {group.name[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {group.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  size="small"
                  label={group.subject}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  icon={getPrivacyIcon(group.privacy)}
                  label={group.privacy}
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                  {group.members.length} members
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<VideoCall />}
              color="primary"
              onClick={handleStartCall}
            >
              Start Call
            </Button>
            <IconButton>
              <PersonAdd />
            </IconButton>
            <IconButton onClick={handleLeaveGroup}>
              <ExitToApp />
            </IconButton>
          </Box>
        </Box>
        {group.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {group.description}
          </Typography>
        )}
      </Paper>

      {/* Active Session Banner */}
      {activeSession && (
        <Alert
          severity="info"
          icon={<VideoCall />}
          sx={{ mb: 2 }}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<VideoCall />}
              onClick={() => navigate(`/sessions/${activeSession._id}`)}
            >
              Join Session
            </Button>
          }
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Active Study Session: {activeSession.title}
          </Typography>
          <Typography variant="body2">
            Started by {activeSession.host?.firstName} {activeSession.host?.lastName} • 
            {activeSession.participants?.length || 0} participant(s) in the call
          </Typography>
        </Alert>
      )}
      {/* Debug: Show active session state */}
      {console.log('Active session state:', activeSession)}

      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {messagesLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <Typography color="text.secondary">
                    No messages yet. Start the conversation!
                  </Typography>
                </Box>
              ) : (
                <List>
                  {messages.map((msg) => (
                    <MessageItem key={msg._id} msg={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </List>
              )}
            </Box>

            {/* Reply Preview */}
            {replyingTo && (
              <Box sx={{ p: 1, backgroundColor: 'action.selected' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Replying to {replyingTo.sender.firstName}
                  </Typography>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    ×
                  </IconButton>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {replyingTo.content.length > 100 
                    ? `${replyingTo.content.substring(0, 100)}...`
                    : replyingTo.content
                  }
                </Typography>
              </Box>
            )}

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendingMessage}
                />
                <IconButton>
                  <EmojiEmotions />
                </IconButton>
                <Button
                  variant="contained"
                  endIcon={<Send />}
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendingMessage}
                >
                  {sendingMessage ? <CircularProgress size={20} /> : 'Send'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', p: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Members" />
              <Tab label="Files" />
            </Tabs>

            {activeTab === 0 && (
              <List>
                {group.members.map((member) => (
                  <ListItem key={member.user._id}>
                    <ListItemAvatar>
                      <Badge
                        color="success"
                        variant="dot"
                        invisible={false} // In real app, check online status
                      >
                        <Avatar src={member.user.avatar}>
                          {member.user.firstName[0]}{member.user.lastName[0]}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${member.user.firstName} ${member.user.lastName}`}
                      secondary={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Chip label={member.role} size="small" />
                          <Typography variant="caption" component="span">
                            @{member.user.username}
                          </Typography>
                        </span>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  No files shared yet.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Message Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedMessage) {
            setReplyingTo(selectedMessage);
          }
          setAnchorEl(null);
        }}>
          <Reply fontSize="small" sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        {selectedMessage?.sender._id === user?._id && (
          <MenuItem onClick={() => {
            // Handle edit message
            setAnchorEl(null);
          }}>
            Edit
          </MenuItem>
        )}
        {(selectedMessage?.sender._id === user?._id || getUserRole() === 'owner' || getUserRole() === 'moderator') && (
          <MenuItem onClick={() => {
            // Handle delete message
            setAnchorEl(null);
          }}>
            Delete
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default GroupDetail;
