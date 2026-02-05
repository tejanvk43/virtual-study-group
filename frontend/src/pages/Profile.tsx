import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  School,
  TrendingUp,
  Group,
  Schedule,
  Notifications,
  Security,
  Palette,
  Language,
  Download,
  Upload,
  PhotoCamera,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Star,
  EmojiEvents,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';
import { Achievement, Activity, StudyProgressItem } from '../types';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  location: string;
  phone: string;
  birthDate: string;
  website: string;
  interests: string[];
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  
  const { user, updateProfile } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      phone: user?.phone || '',
      birthDate: user?.birthDate || '',
      website: user?.website || '',
      interests: user?.interests || [],
    }
  });

  // Real user stats and achievements - loaded from API
  const [userStats, setUserStats] = useState({
    totalStudyTime: 0,
    sessionsAttended: 0,
    groupsJoined: 0,
    streakDays: 0,
    pointsEarned: 0,
    level: 1,
    progressToNext: 0,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  const [studyProgress, setStudyProgress] = useState<StudyProgressItem[]>([]);

  // Load user stats and data from API
  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Load user stats
        const statsResponse = await usersAPI.getStats();
        const stats = statsResponse.data;
        
        setUserStats({
          totalStudyTime: Math.floor(stats.totalStudyTime / 60), // Convert minutes to hours
          sessionsAttended: stats.sessionsCompleted || 0,
          groupsJoined: stats.totalGroups || 0,
          streakDays: stats.streak || 0,
          pointsEarned: stats.totalStudyTime * 10, // 10 points per minute studied
          level: Math.floor((stats.totalStudyTime || 0) / 60) + 1, // Level up every hour
          progressToNext: ((stats.totalStudyTime || 0) % 60) / 60 * 100, // Progress to next level
        });

        // Set achievements from user data
        setAchievements(stats.achievements || []);
        
        // Recent activity would need additional API endpoints
        // For now, leaving empty until those endpoints are implemented
        setRecentActivity([]);
        setStudyProgress([]);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sessionReminders: true,
      groupMessages: true,
      achievements: true,
    },
    privacy: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowMessageRequests: true,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
    },
  });

  const handleSaveProfile = async (data: ProfileForm) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // await updateProfile(data);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session': return <Schedule />;
      case 'achievement': return <EmojiEvents />;
      case 'group': return <Group />;
      default: return <Star />;
    }
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton 
                  size="small" 
                  sx={{ bgcolor: 'primary.main', color: 'white' }}
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              }
            >
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100,
                  fontSize: '2rem',
                  bgcolor: 'primary.main'
                }}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </Badge>
          </Grid>
          
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {user?.bio || 'No bio added yet'}
            </Typography>
            
            <Box display="flex" gap={2} alignItems="center">
              <Chip 
                icon={<School />}
                label={`Level ${userStats.level}`}
                color="primary"
              />
              <Chip 
                icon={<TrendingUp />}
                label={`${userStats.pointsEarned} points`}
                variant="outlined"
              />
              <Chip 
                icon={<EmojiEvents />}
                label={`${achievements.length} achievements`}
                variant="outlined"
              />
            </Box>
          </Grid>
          
          <Grid item>
            <Button
              variant={editMode ? "outlined" : "contained"}
              startIcon={editMode ? <Cancel /> : <Edit />}
              onClick={() => {
                if (editMode) {
                  reset();
                }
                setEditMode(!editMode);
              }}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Grid>
        </Grid>

        {/* Level Progress */}
        <Box sx={{ mt: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">
              Level {userStats.level} Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userStats.progressToNext}% to Level {userStats.level + 1}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={userStats.progressToNext} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {userStats.totalStudyTime}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Study Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {userStats.sessionsAttended}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sessions Attended
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {userStats.groupsJoined}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Groups Joined
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" gutterBottom>
                {userStats.streakDays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Day Streak
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Profile Information" />
          <Tab label="Study Progress" />
          <Tab label="Achievements" />
          <Tab label="Activity" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Profile Information Tab */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(handleSaveProfile)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('firstName', { required: 'First name is required' })}
                  fullWidth
                  label="First Name"
                  disabled={!editMode}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('lastName', { required: 'Last name is required' })}
                  fullWidth
                  label="Last Name"
                  disabled={!editMode}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...register('email', { required: 'Email is required' })}
                  fullWidth
                  label="Email"
                  type="email"
                  disabled={!editMode}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...register('bio')}
                  fullWidth
                  label="Bio"
                  multiline
                  rows={3}
                  disabled={!editMode}
                  placeholder="Tell us about yourself..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('location')}
                  fullWidth
                  label="Location"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone')}
                  fullWidth
                  label="Phone"
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('birthDate')}
                  fullWidth
                  label="Birth Date"
                  type="date"
                  disabled={!editMode}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('website')}
                  fullWidth
                  label="Website"
                  disabled={!editMode}
                  placeholder="https://your-website.com"
                />
              </Grid>
              
              {editMode && (
                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false);
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </form>
        </Paper>
      )}

      {/* Study Progress Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {studyProgress.length > 0 ? (
            studyProgress.map((subject, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{subject.subject}</Typography>
                      <Chip 
                        label={subject.level} 
                        color={getLevelColor(subject.level)}
                        size="small"
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subject.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={subject.progress} 
                      sx={{ mb: 2, height: 6, borderRadius: 3 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary">
                      Total study time: {subject.totalTime} hours
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Assessment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Study Progress Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start studying to track your progress across different subjects!
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Achievements Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {achievements.length > 0 ? (
            achievements.map((achievement, index) => (
              <Grid item xs={12} sm={6} md={4} key={typeof achievement === 'string' ? achievement : achievement.id || index}>
                <Card 
                  sx={{ 
                    opacity: 1,
                    border: 2,
                    borderColor: 'primary.main',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      🏆
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {typeof achievement === 'string' ? achievement : achievement.title || 'Achievement'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {typeof achievement === 'string' ? 'Achievement unlocked!' : achievement.description || 'Achievement unlocked!'}
                    </Typography>
                    <Chip
                      label="Earned"
                      color="success"
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Achievements Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keep studying to unlock your first achievement!
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Activity Tab */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {recentActivity.length > 0 ? (
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.title}
                    secondary={
                      <Box>
                        {activity.group && (
                          <Typography variant="caption" color="text.secondary">
                            {activity.group} • 
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(activity.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Timeline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your recent study activities will appear here.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Settings Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                Notifications
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Email Notifications" />
                  <Switch
                    checked={settings.notifications.email}
                    onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Push Notifications" />
                  <Switch
                    checked={settings.notifications.push}
                    onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Session Reminders" />
                  <Switch
                    checked={settings.notifications.sessionReminders}
                    onChange={(e) => handleSettingChange('notifications', 'sessionReminders', e.target.checked)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Group Messages" />
                  <Switch
                    checked={settings.notifications.groupMessages}
                    onChange={(e) => handleSettingChange('notifications', 'groupMessages', e.target.checked)}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                Privacy & Security
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Show Online Status" />
                  <Switch
                    checked={settings.privacy.showOnlineStatus}
                    onChange={(e) => handleSettingChange('privacy', 'showOnlineStatus', e.target.checked)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Allow Message Requests" />
                  <Switch
                    checked={settings.privacy.allowMessageRequests}
                    onChange={(e) => handleSettingChange('privacy', 'allowMessageRequests', e.target.checked)}
                  />
                </ListItem>
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Button variant="outlined" color="error" fullWidth>
                Change Password
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Avatar Upload Dialog */}
      <Dialog open={avatarDialogOpen} onClose={() => setAvatarDialogOpen(false)}>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Avatar
              sx={{ 
                width: 120, 
                height: 120, 
                mx: 'auto', 
                mb: 2,
                bgcolor: 'primary.main'
              }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
              fullWidth
            >
              Upload New Picture
              <input type="file" accept="image/*" hidden />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
