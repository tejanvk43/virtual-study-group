import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Menu,
  Tabs,
  Tab,
  Chip,
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  VideoCall,
  Schedule,
  Group,
  AccessTime,
  Person,
  MoreVert,
  Edit,
  Delete,
  PlayArrow,
  CalendarToday,
  School,
  Assignment,
  Poll,
  Quiz,
  TrendingUp,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { StudySession } from '../types';
import { studySessionService } from '../services/studySessionService';
import { groupsAPI } from '../services/api';

interface CreateSessionForm {
  title: string;
  description: string;
  groupId: string;
  startTime: string;
  duration: number;
  type: 'study' | 'discussion' | 'presentation' | 'exam-prep' | 'project-work';
  maxParticipants: number;
}

const StudySessions: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);
  const [pastSessions, setPastSessions] = useState<StudySession[]>([]);
  const [mySessions, setMySessions] = useState<StudySession[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CreateSessionForm>({
    defaultValues: {
      title: '',
      description: '',
      groupId: '',
      startTime: '',
      duration: 60,
      type: 'study',
      maxParticipants: 10
    }
  });

  // Fetch sessions data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const [upcoming, past, my, groupsResponse] = await Promise.all([
          studySessionService.getUpcomingSessions(),
          studySessionService.getPastSessions(),
          studySessionService.getMySessions(),
          groupsAPI.getUserGroups()
        ]);
        setUpcomingSessions(upcoming);
        setPastSessions(past);
        setMySessions(my);
        
        console.log('Groups response:', groupsResponse);
        console.log('Groups data:', groupsResponse.data);
        
        // The API returns groups directly in response.data
        const groups = groupsResponse.data || groupsResponse;
        console.log('Processed groups:', groups);
        setUserGroups(Array.isArray(groups) ? groups : []);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        toast.error('Failed to load study sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleSessionActionClick = (event: React.MouseEvent<HTMLElement>, session: StudySession) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Use timeout to ensure focus is properly released before clearing state
    setTimeout(() => setSelectedSession(null), 0);
  };

  const handleCreateDialogOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    reset();
  };

  const onCreateSubmit = async (data: CreateSessionForm) => {
    try {
      setLoading(true);
      
      // Prepare data in the format expected by the backend
      const sessionData = {
        title: data.title,
        description: data.description,
        groupId: data.groupId,
        scheduledStart: new Date(data.startTime).toISOString(),
        scheduledEnd: new Date(new Date(data.startTime).getTime() + data.duration * 60000).toISOString(),
        type: data.type,
        agenda: []
      };

      const createdSession = await studySessionService.createSession(sessionData as any);
      setUpcomingSessions(prev => [createdSession, ...prev]);
      handleCreateDialogClose();
      toast.success('Study session created successfully!');
    } catch (error) {
      console.error('Failed to create study session:', error);
      toast.error('Failed to create study session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (session: StudySession) => {
    try {
      // Check if user is already a participant (including if they're the host)
      const isParticipant = session.participants?.some(
        (p: any) => p.user?._id === user?._id || p.user === user?._id
      );
      const isHost = session.host?._id === user?._id;
      
      if (isParticipant || isHost) {
        // Already joined, just navigate to the session
        navigate(`/sessions/${session._id}`);
        return;
      }
      
      await studySessionService.joinSession(session._id);
      toast.success('Successfully joined session');
      navigate(`/sessions/${session._id}`);
    } catch (error: any) {
      console.error('Failed to join session:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to join session';
      toast.error(errorMessage);
    }
  };

  const handleEditSession = (session: StudySession) => {
    // TODO: Implement edit session dialog
    console.log('Edit session:', session);
  };

  const handleCancelSession = async (session: StudySession) => {
    // Confirm before canceling
    if (!window.confirm(`Are you sure you want to cancel and delete "${session.title}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await studySessionService.cancelSession(session._id);
      
      // Remove from all session lists
      setUpcomingSessions(prev => prev.filter(s => s._id !== session._id));
      setMySessions(prev => prev.filter(s => s._id !== session._id));
      setPastSessions(prev => prev.filter(s => s._id !== session._id));
      
      toast.success('Study session cancelled and removed successfully!');
    } catch (error) {
      console.error('Failed to cancel study session:', error);
      toast.error('Failed to cancel study session');
    } finally {
      setLoading(false);
    }
  };

  const sessionTypes = [
    { value: 'study', label: 'Study Session', icon: <School /> },
    { value: 'discussion', label: 'Discussion', icon: <Assignment /> },
    { value: 'presentation', label: 'Presentation', icon: <Poll /> },
    { value: 'exam-prep', label: 'Exam Preparation', icon: <Quiz /> },
    { value: 'project-work', label: 'Project Work', icon: <TrendingUp /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'live': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const renderSessionCard = (session: StudySession) => (
    <Grid item xs={12} sm={6} md={4} key={session._id}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6" gutterBottom>
              {session.title}
            </Typography>
            <IconButton onClick={(e) => handleSessionActionClick(e, session)}>
              <MoreVert />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {session.description}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Group sx={{ mr: 1 }} />
              {session.group?.name || 'No Group'}
            </Typography>

            <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Schedule sx={{ mr: 1 }} />
              {format(new Date(session.scheduledStart), 'PPp')}
            </Typography>

            <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Person sx={{ mr: 1 }} />
              Host: {session.host?.firstName || ''} {session.host?.lastName || ''}
            </Typography>

            <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ mr: 1 }} />
              {Math.round((new Date(session.scheduledEnd).getTime() - new Date(session.scheduledStart).getTime()) / 60000)} minutes
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(session.participants || []).slice(0, 5).map((participant, index) => (
                <Tooltip key={index} title={`${participant.user?.firstName || ''} ${participant.user?.lastName || ''}`}>
                  <Avatar src={participant.user?.avatar} sx={{ width: 32, height: 32 }}>
                    {participant.user?.firstName?.[0] || '?'}
                  </Avatar>
                </Tooltip>
              ))}
              {(session.participants?.length || 0) > 5 && (
                <Tooltip title={`+${(session.participants?.length || 0) - 5} more participants`}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    +{(session.participants?.length || 0) - 5}
                  </Avatar>
                </Tooltip>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              {(() => {
                const isParticipant = session.participants?.some(
                  (p: any) => p.user?._id === user?._id || p.user === user?._id
                );
                const isHost = session.host?._id === user?._id;
                
                if (isHost || isParticipant) {
                  return (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => navigate(`/sessions/${session._id}`)}
                      startIcon={<VideoCall />}
                    >
                      Enter Session
                    </Button>
                  );
                } else {
                  return (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => handleJoinSession(session)}
                      startIcon={<VideoCall />}
                    >
                      Join Session
                    </Button>
                  );
                }
              })()}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Study Sessions</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleCreateDialogOpen}
        >
          Create Session
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Upcoming Sessions" />
        <Tab label="Past Sessions" />
        <Tab label="My Sessions" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {activeTab === 0 && upcomingSessions.map(renderSessionCard)}
          {activeTab === 1 && pastSessions.map(renderSessionCard)}
          {activeTab === 2 && mySessions.map(renderSessionCard)}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        disableAutoFocusItem
      >
        <MenuItem onClick={() => {
          if (selectedSession) {
            handleMenuClose();
            setTimeout(() => handleEditSession(selectedSession), 0);
          }
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit Session
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedSession) {
            const session = selectedSession;
            handleMenuClose();
            setTimeout(() => handleCancelSession(session), 0);
          }
        }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          Cancel Session
        </MenuItem>
      </Menu>

      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogTitle>Create New Study Session</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Title"
                fullWidth
                {...register('title', { required: 'Title is required' })}
                error={!!errors.title}
                helperText={errors.title?.message}
                margin="normal"
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                {...register('description', { required: 'Description is required' })}
                error={!!errors.description}
                helperText={errors.description?.message}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Session Type</InputLabel>
                <Controller
                  name="type"
                  control={control}
                  rules={{ required: 'Session type is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      error={!!errors.type}
                      label="Session Type"
                    >
                      {sessionTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Select Group</InputLabel>
                <Controller
                  name="groupId"
                  control={control}
                  rules={{ required: 'Group is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      error={!!errors.groupId}
                      label="Select Group"
                    >
                      {userGroups.map((group: any) => (
                        <MenuItem key={group._id} value={group._id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.groupId && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {errors.groupId.message}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Start Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('startTime', { required: 'Start time is required' })}
                error={!!errors.startTime}
                helperText={errors.startTime?.message}
                margin="normal"
              />

              <TextField
                label="Duration (minutes)"
                type="number"
                fullWidth
                {...register('duration', {
                  required: 'Duration is required',
                  min: { value: 15, message: 'Duration must be at least 15 minutes' },
                  max: { value: 480, message: 'Duration cannot exceed 8 hours' }
                })}
                error={!!errors.duration}
                helperText={errors.duration?.message}
                margin="normal"
              />

              <TextField
                label="Max Participants"
                type="number"
                fullWidth
                {...register('maxParticipants', {
                  required: 'Max participants is required',
                  min: { value: 2, message: 'At least 2 participants required' },
                  max: { value: 50, message: 'Cannot exceed 50 participants' }
                })}
                error={!!errors.maxParticipants}
                helperText={errors.maxParticipants?.message}
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCreateDialogClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Create Session'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default StudySessions;
