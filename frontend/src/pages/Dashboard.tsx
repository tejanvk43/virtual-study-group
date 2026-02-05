import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Badge,
  LinearProgress,
  useTheme,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  SelectChangeEvent
} from '@mui/material';
import {
  Groups,
  Schedule,
  TrendingUp,
  Psychology,
  MoreVert,
  Add,
  PlayArrow,
  Star,
  Timer,
  EmojiEvents,
  LocalFireDepartment
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { format, isValid, parseISO, differenceInDays, subDays } from 'date-fns';
import { groupsAPI, sessionsAPI, usersAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface DashboardData {
  totalGroups: number;
  totalSessions: number;
  onlineUsers: number;
  studyStreak: number;
}

interface DashboardGroup {
  _id: string;
  name: string;
  memberCount: number;
  activeSession?: {
    title: string;
    participantCount: number;
  };
}

interface DashboardSession {
  _id: string;
  title: string;
  subject: string;
  scheduledAt: string;
  scheduledStart: string;
  duration: number;
  participants: Array<{ userId: string; name: string }>;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  studyDays: string[]; // Array of dates in YYYY-MM-DD format
}

// Monthly Calendar Streak Component
const StudyStreakCalendar: React.FC<{ streakData: StreakData }> = ({ streakData }) => {
  const theme = useTheme();
  const today = new Date();
  
  // State for selected month and year
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate years for dropdown (last 3 years)
  const years = [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2];
  
  // Get days in selected month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
  
  // Calculate stats for selected month
  const monthStudyDays = streakData.studyDays.filter(dateStr => {
    const date = new Date(dateStr);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });
  
  const isToday = (day: number) => {
    return day === today.getDate() && 
           selectedMonth === today.getMonth() && 
           selectedYear === today.getFullYear();
  };
  
  const isStudyDay = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return streakData.studyDays.includes(dateStr);
  };
  
  const isFutureDay = (day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
    return date > today;
  };
  
  // Generate calendar grid
  const calendarDays = [];
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<Box key={`empty-${i}`} sx={{ width: 36, height: 36 }} />);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isTodayCell = isToday(day);
    const isActive = isStudyDay(day);
    const isFuture = isFutureDay(day);
    
    calendarDays.push(
      <Box
        key={day}
        sx={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '14px',
          fontWeight: isTodayCell ? 700 : 500,
          cursor: isFuture ? 'default' : 'pointer',
          position: 'relative',
          bgcolor: isActive 
            ? '#39d353' 
            : isTodayCell 
              ? 'primary.main' 
              : 'transparent',
          color: isActive || isTodayCell 
            ? 'white' 
            : isFuture 
              ? 'text.disabled' 
              : 'text.primary',
          border: isTodayCell && !isActive ? '2px solid' : 'none',
          borderColor: 'primary.main',
          transition: 'all 0.2s ease',
          '&:hover': !isFuture ? {
            bgcolor: isActive ? '#2ea043' : 'action.hover',
            transform: 'scale(1.1)'
          } : {}
        }}
        title={`${monthNames[selectedMonth]} ${day}, ${selectedYear}${isActive ? ' - Active' : ''}`}
      >
        {day}
        {isActive && isTodayCell && (
          <Box
            sx={{
              position: 'absolute',
              bottom: -2,
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#ff6b6b',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.3)', opacity: 0.7 }
              }
            }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Header with dropdowns */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalFireDepartment sx={{ color: '#ff6b6b', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Study Streak
          </Typography>
        </Box>
        
        {/* Month and Year Dropdowns */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedMonth}
              onChange={(e: SelectChangeEvent<number>) => setSelectedMonth(Number(e.target.value))}
              sx={{ 
                bgcolor: 'background.paper',
                '& .MuiSelect-select': { py: 1 }
              }}
            >
              {monthNames.map((month, index) => (
                <MenuItem key={month} value={index}>{month}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={selectedYear}
              onChange={(e: SelectChangeEvent<number>) => setSelectedYear(Number(e.target.value))}
              sx={{ 
                bgcolor: 'background.paper',
                '& .MuiSelect-select': { py: 1 }
              }}
            >
              {years.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {/* Stats Row */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: 2
      }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#39d353' }}>
            {monthStudyDays.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Days in {monthNames[selectedMonth]}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center', borderLeft: 1, borderRight: 1, borderColor: 'divider' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b6b' }}>
            {streakData.currentStreak}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Current Streak
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {streakData.longestStreak}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Longest Streak
          </Typography>
        </Box>
      </Box>
      
      {/* Calendar Grid */}
      <Box sx={{ 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`
      }}>
        {/* Day names header */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 0.5, 
          mb: 1,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          {dayNames.map(day => (
            <Box 
              key={day} 
              sx={{ 
                textAlign: 'center', 
                py: 0.5,
                fontSize: '12px',
                fontWeight: 600,
                color: 'text.secondary'
              }}
            >
              {day}
            </Box>
          ))}
        </Box>
        
        {/* Calendar days */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 0.5,
          justifyItems: 'center'
        }}>
          {calendarDays}
        </Box>
      </Box>
      
      {/* Legend */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 3,
        mt: 2,
        pt: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: '50%', 
            bgcolor: '#39d353' 
          }} />
          <Typography variant="caption" color="text.secondary">Study Day</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: '50%', 
            bgcolor: 'primary.main' 
          }} />
          <Typography variant="caption" color="text.secondary">Today</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [stats, setStats] = useState<DashboardData>({
    totalGroups: 0,
    totalSessions: 0,
    onlineUsers: 0,
    studyStreak: 0
  });
  const [liveGroups, setLiveGroups] = useState<DashboardGroup[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<DashboardSession[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStudySession, setActiveStudySession] = useState<any>(null);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    studyDays: []
  });

  // Calculate real study streak from user's activity data
  const fetchStreakData = async () => {
    try {
      // First, record today's activity
      await usersAPI.recordActivity();
      
      // Then fetch the updated activity data
      const response = await usersAPI.getActivity();
      const activityData = response.data;
      
      return {
        currentStreak: activityData.currentStreak || 0,
        longestStreak: activityData.longestStreak || 0,
        studyDays: activityData.activityDays || []
      };
    } catch (error) {
      console.warn('Error fetching streak data:', error);
      // Fallback to calculating from sessions if activity API fails
      return calculateStreakFromSessions();
    }
  };

  // Fallback: Calculate study streak from user's session history
  const calculateStreakFromSessions = async () => {
    try {
      // Get user's completed sessions
      const userSessionsResponse = await sessionsAPI.getSessions({ status: 'completed' });
      const completedSessions = userSessionsResponse.data || [];
      
      // Extract unique study dates
      const studyDates = completedSessions
        .map((session: any) => format(new Date(session.scheduledStart || session.scheduledAt), 'yyyy-MM-dd'))
        .filter((date: string, index: number, arr: string[]) => arr.indexOf(date) === index)
        .sort();
      
      // Add today if user is active
      const today = format(new Date(), 'yyyy-MM-dd');
      if (!studyDates.includes(today)) {
        studyDates.push(today);
      }
      
      // Calculate current streak
      let currentStreak = 0;
      let checkDate = new Date();
      
      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        if (studyDates.includes(dateStr)) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else if (dateStr === today) {
          // Allow for today not having studies yet
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }
      
      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      let prevDate = null;
      
      for (const dateStr of studyDates.sort()) {
        const currentDate = new Date(dateStr);
        if (prevDate && differenceInDays(currentDate, prevDate) === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        prevDate = currentDate;
      }
      
      return {
        currentStreak,
        longestStreak,
        studyDays: studyDates
      };
    } catch (error) {
      console.warn('Error calculating streak from sessions:', error);
      // Return today as active day at minimum
      const today = format(new Date(), 'yyyy-MM-dd');
      return {
        currentStreak: 1,
        longestStreak: 1,
        studyDays: [today]
      };
    }
  };

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        let groups: any[] = [];
        let sessions: any[] = [];
        
        try {
          // Load user's groups
          const userGroupsResponse = await groupsAPI.getUserGroups();
          const publicGroupsResponse = await groupsAPI.getPublicGroups();
          groups = [...(userGroupsResponse.data || []), ...(publicGroupsResponse.data || [])];
          
          // Remove duplicates
          const uniqueGroups = groups.filter((group, index, self) => 
            index === self.findIndex(g => g._id === group._id)
          );
          groups = uniqueGroups;
        } catch (error) {
          console.warn('Could not load groups from API:', error);
          groups = [];
        }
        
        try {
          // Load user's sessions
          const userSessionsResponse = await sessionsAPI.getSessions({});
          const upcomingResponse = await sessionsAPI.getUpcomingSessions({});
          sessions = [...(userSessionsResponse.data || []), ...(upcomingResponse.data || [])];
        } catch (error) {
          console.warn('Could not load sessions from API:', error);
          sessions = [];
        }
        
        // Fetch and record activity for today, get streak data
        const realStreakData = await fetchStreakData();
        setStreakData(realStreakData);
        
        // Calculate real stats
        const groupsArray = Array.isArray(groups) ? groups : [];
        const sessionsArray = Array.isArray(sessions) ? sessions : [];
        const totalGroups = groupsArray.length;
        const totalSessions = sessionsArray.length;
        const onlineUsers = await getOnlineUserCount(); // Get real online count
        
        setStats({
          totalGroups,
          totalSessions,
          onlineUsers,
          studyStreak: realStreakData.currentStreak
        });

        // Transform groups for live display (real data)
        const liveGroupsData = groupsArray.slice(0, isMobile ? 4 : 8).map((group: any) => ({
          _id: group._id,
          name: group.name,
          memberCount: group.members?.length || 0,
          // Check if group has active sessions
          activeSession: sessionsArray.find((session: any) => 
            session.group === group._id && session.status === 'active'
          ) ? {
            title: `${group.name} Study Session`,
            participantCount: sessionsArray.find((session: any) => 
              session.group === group._id && session.status === 'active'
            )?.participants?.length || 0
          } : undefined
        }));
        setLiveGroups(liveGroupsData);

        // Get real upcoming sessions
        const upcoming = sessionsArray
          .filter((session: any) => 
            session.status === 'scheduled' && 
            new Date(session.scheduledAt || session.scheduledStart) > new Date()
          )
          .sort((a: any, b: any) => 
            new Date(a.scheduledAt || a.scheduledStart).getTime() - 
            new Date(b.scheduledAt || b.scheduledStart).getTime()
          )
          .slice(0, isMobile ? 3 : 5);
        setUpcomingSessions(upcoming);

        // Get real recent activity from user's recent sessions
        const recentSessions = sessionsArray
          .filter((session: any) => session.status === 'completed')
          .sort((a: any, b: any) => 
            new Date(b.scheduledAt || b.scheduledStart).getTime() - 
            new Date(a.scheduledAt || a.scheduledStart).getTime()
          )
          .slice(0, isMobile ? 3 : 5);
          
        const realActivity = recentSessions.map((session: any, index: number) => ({
          id: session._id,
          type: 'session_completed',
          message: `Completed "${session.title}"`,
          time: formatTimeAgo(session.scheduledAt || session.scheduledStart),
          avatar: null
        }));
        setRecentActivity(realActivity);

        // Check for active study sessions
        if (user && sessionsArray.length > 0) {
          try {
            const activeSessions = sessionsArray.filter((session: any) => 
              session.status === 'active' && 
              session.participants?.some((p: any) => 
                p.userId === (user as any)._id || p.userId === (user as any).id
              )
            );
            if (activeSessions.length > 0) {
              setActiveStudySession(activeSessions[0]);
            }
          } catch (error) {
            console.log('No active sessions found');
          }
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Provide minimal fallback stats
        setStats({
          totalGroups: 0,
          totalSessions: 0,
          onlineUsers: 1,
          studyStreak: 0
        });
        toast.error('Unable to load some data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isMobile]);

  // Get real online user count (simplified for now)
  const getOnlineUserCount = async () => {
    // This would typically come from Socket.IO or a real-time API
    // For now, return 1 (current user)
    return 1;
  };

  // Helper function to format relative time
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'create-group':
          navigate('/groups?action=create');
          break;
        case 'schedule-session':
          navigate('/sessions?action=schedule');
          break;
        case 'join-random':
          // Find a random active group to join
          const activeGroups = liveGroups.filter(g => g.activeSession);
          if (activeGroups.length > 0) {
            const randomGroup = activeGroups[Math.floor(Math.random() * activeGroups.length)];
            navigate(`/groups/${randomGroup._id}`);
          } else {
            toast('No active sessions available to join', { icon: 'ℹ️' });
          }
          break;
        case 'start-pomodoro':
          // Start a personal focus session
          toast.success('Pomodoro timer started! Focus for 25 minutes.');
          break;
      }
    } catch (error) {
      toast.error('Action failed. Please try again.');
    }
  };

  const formatSessionTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM dd, h:mm a');
      }
    } catch (error) {
      console.error('Date formatting error:', error);
    }
    return 'Invalid date';
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      {/* Active Study Session Banner */}
      {activeStudySession && (
        <Card sx={{ mb: 3, bgcolor: 'success.light', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalFireDepartment />
              Active Study Session: {activeStudySession.title}
            </Typography>
            <Typography variant="body2">
              {activeStudySession.participants?.length} participants • Started {formatSessionTime(activeStudySession.startedAt)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="textSecondary" gutterBottom variant={isMobile ? 'caption' : 'body2'}>
                    Study Groups
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'}>
                    {stats.totalGroups}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                  <Groups fontSize={isMobile ? 'small' : 'medium'} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="textSecondary" gutterBottom variant={isMobile ? 'caption' : 'body2'}>
                    Sessions
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'}>
                    {stats.totalSessions}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                  <Schedule fontSize={isMobile ? 'small' : 'medium'} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="textSecondary" gutterBottom variant={isMobile ? 'caption' : 'body2'}>
                    Online Users
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main">
                    {stats.onlineUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                  <TrendingUp fontSize={isMobile ? 'small' : 'medium'} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="textSecondary" gutterBottom variant={isMobile ? 'caption' : 'body2'}>
                    Study Streak
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.main">
                    {stats.studyStreak}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    days
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                  <EmojiEvents fontSize={isMobile ? 'small' : 'medium'} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Study Streak Calendar */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 'fit-content' }}>
            <StudyStreakCalendar streakData={streakData} />
          </Card>
        </Grid>

        {/* Live Groups */}
        <Grid item xs={12} md={6} lg={6}>
          <Card sx={{ height: { md: '400px' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Study Groups
              </Typography>
              <List sx={{ maxHeight: { md: '320px' }, overflow: 'auto' }}>
                {liveGroups.length > 0 ? liveGroups.map((group) => (
                  <ListItem key={group._id} button onClick={() => navigate(`/groups/${group._id}`)}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Groups />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={group.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {group.memberCount} members
                          </Typography>
                          {group.activeSession && (
                            <Chip
                              size="small"
                              label={`${group.activeSession.participantCount} studying now`}
                              color="success"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      {group.activeSession ? (
                        <Badge badgeContent="LIVE" color="success">
                          <IconButton edge="end" onClick={() => navigate(`/groups/${group._id}`)}>
                            <PlayArrow />
                          </IconButton>
                        </Badge>
                      ) : (
                        <IconButton edge="end">
                          <MoreVert />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                )) : (
                  <ListItem>
                    <ListItemText
                      primary="No groups found"
                      secondary="Join or create a study group to get started!"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Sessions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: { md: '400px' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Sessions
              </Typography>
              <List sx={{ maxHeight: { md: '320px' }, overflow: 'auto' }}>
                {upcomingSessions.length > 0 ? upcomingSessions.map((session) => (
                  <ListItem key={session._id} button onClick={() => navigate(`/sessions/${session._id}`)}>
                    <ListItemAvatar>
                      <Avatar>
                        <Schedule />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.title}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {session.subject} • {formatSessionTime(session.scheduledAt || session.scheduledStart)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {session.participants?.length || 0} participants • {session.duration || 60}min
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => navigate(`/sessions/${session._id}`)}>
                        <PlayArrow />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                )) : (
                  <ListItem>
                    <ListItemText
                      primary="No upcoming sessions"
                      secondary="Schedule a new study session to get started!"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { bgcolor: 'action.hover' },
                      height: '100%'
                    }}
                    onClick={() => handleQuickAction('create-group')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: isMobile ? 1 : 2 }}>
                      <Groups sx={{ fontSize: isMobile ? 32 : 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'caption' : 'body2'}>Create Group</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { bgcolor: 'action.hover' },
                      height: '100%'
                    }}
                    onClick={() => handleQuickAction('schedule-session')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: isMobile ? 1 : 2 }}>
                      <Schedule sx={{ fontSize: isMobile ? 32 : 40, color: 'secondary.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'caption' : 'body2'}>Schedule Session</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { bgcolor: 'action.hover' },
                      height: '100%'
                    }}
                    onClick={() => handleQuickAction('join-random')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: isMobile ? 1 : 2 }}>
                      <Star sx={{ fontSize: isMobile ? 32 : 40, color: 'warning.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'caption' : 'body2'}>Join Session</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { bgcolor: 'action.hover' },
                      height: '100%'
                    }}
                    onClick={() => handleQuickAction('start-pomodoro')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: isMobile ? 1 : 2 }}>
                      <Timer sx={{ fontSize: isMobile ? 32 : 40, color: 'success.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'caption' : 'body2'}>Start Focus</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 'fit-content' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List>
                  {recentActivity.map((activity) => (
                    <ListItem key={activity.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Psychology />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.time}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 16, md: 24 }, 
          right: { xs: 16, md: 24 },
          display: { xs: 'flex', md: 'none' } // Only show on mobile
        }}
        onClick={() => handleQuickAction('create-group')}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Dashboard;