import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Badge,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard,
  Groups,
  School,
  Chat,
  Person,
  Settings,
  Logout,
  ExpandLess,
  ExpandMore,
  Add,
  Notifications,
  VideoCall,
  Circle
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { groupsAPI, sessionsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

interface Group {
  _id: string;
  name: string;
  subject: string;
  memberCount: number;
  hasActiveSession: boolean;
  unreadMessages: number;
  privacy: 'public' | 'private' | 'invite-only';
  members: any[];
  stats: {
    messagesCount: number;
    totalSessions: number;
  };
  unreadCount?: number;
}

const DRAWER_WIDTH = 280;

const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose, 
  variant = 'permanent' 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserGroups();
      
      // Set up periodic refresh for group status
      const interval = setInterval(fetchUserGroups, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      
      // Get user's groups
      const groupsResponse = await groupsAPI.getUserGroups();
      const userGroupsData = groupsResponse.data || [];
      
      // Get active sessions to determine group status
      let activeSessions: any[] = [];
      try {
        const sessionsResponse = await sessionsAPI.getSessions({});
        activeSessions = (sessionsResponse.data || []).filter((session: any) => session.status === 'active');
      } catch (sessionError: any) {
        console.warn('Could not load sessions for group status:', sessionError);
        activeSessions = [];
      }
      
      // Transform groups with real status data
      const transformedGroups: Group[] = userGroupsData.map((group: any) => {
        const activeSession = activeSessions.find((session: any) => session.group === group._id);
        
        return {
          _id: group._id,
          name: group.name,
          subject: group.subject || 'General',
          memberCount: group.members?.length || 0,
          hasActiveSession: !!activeSession,
          unreadMessages: 0, // This would come from real message API
          privacy: group.privacy || 'public',
          members: group.members || [],
          stats: {
            messagesCount: 0, // Real message count would be fetched
            totalSessions: 0 // Real session count would be fetched
          },
          unreadCount: 0
        };
      });
      
      setUserGroups(transformedGroups);
    } catch (error: any) {
      console.error('Error fetching user groups:', error);
      // Don't show error if user just needs to join groups
      if (error?.response?.status !== 404 && error?.response?.status !== 401) {
        toast.error('Failed to load groups');
      }
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      badge: null,
    },
    {
      text: 'Groups',
      icon: <Groups />,
      path: '/groups',
      badge: null,
    },
    {
      text: 'Study Sessions',
      icon: <School />,
      path: '/sessions',
      badge: null,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{ width: 40, height: 40 }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              @{user?.username}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Navigation */}
      <List sx={{ flexGrow: 1, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                backgroundColor: isActive(item.path) 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: isActive(item.path) 
                    ? theme.palette.primary.main 
                    : 'inherit' 
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive(item.path) ? 600 : 400,
                    color: isActive(item.path) 
                      ? theme.palette.primary.main 
                      : 'inherit',
                  },
                }}
              />
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}

        <Divider sx={{ my: 1 }} />

        {/* My Groups Section */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            sx={{ mx: 1, borderRadius: 1 }}
          >
            <ListItemIcon>
              <Groups />
            </ListItemIcon>
            <ListItemText 
              primary="My Groups" 
              secondary={`${userGroups.length} group${userGroups.length !== 1 ? 's' : ''}`}
            />
            <IconButton size="small" onClick={(e) => {
              e.stopPropagation();
              handleNavigation('/groups');
            }}>
              <Add fontSize="small" />
            </IconButton>
            {groupsExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={groupsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {userGroups.length === 0 && !loading ? (
              <ListItem sx={{ pl: 4 }}>
                <ListItemText
                  primary="No groups yet"
                  secondary="Join or create a group to get started"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ) : (
              userGroups.slice(0, 5).map((group) => (
                <ListItem key={group._id} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(`/groups/${group._id}`)}
                    sx={{ 
                      pl: 4, 
                      mx: 1, 
                      borderRadius: 1,
                      backgroundColor: isActive(`/groups/${group._id}`)
                        ? alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Badge
                        badgeContent={group.hasActiveSession ? <Circle sx={{ fontSize: 8, color: 'success.main' }} /> : null}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        overlap="circular"
                      >
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {group.name[0]}
                        </Avatar>
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            fontWeight={isActive(`/groups/${group._id}`) ? 600 : 400}
                          >
                            {group.name}
                          </Typography>
                          {group.hasActiveSession && (
                            <Chip
                              label="LIVE"
                              size="small"
                              color="success"
                              sx={{ 
                                height: 16, 
                                fontSize: '0.6rem',
                                '& .MuiChip-label': { px: 0.5 }
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={`${group.subject} • ${group.memberCount} members`}
                      secondaryTypographyProps={{ 
                        variant: 'caption',
                        noWrap: true,
                      }}
                    />
                    {group.unreadMessages > 0 && (
                      <Badge 
                        badgeContent={group.unreadMessages} 
                        color="error" 
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem' } }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))
            )}
            {userGroups.length > 5 && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation('/groups')}
                  sx={{ pl: 4, mx: 1, borderRadius: 1 }}
                >
                  <ListItemText
                    primary={`+${userGroups.length - 5} more groups`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      color: 'primary.main',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Collapse>
      </List>

      {/* Bottom Actions */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/profile')}
              sx={{ mx: 1, borderRadius: 1 }}
            >
              <ListItemIcon>
                <Person />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/settings')}
              sx={{ mx: 1, borderRadius: 1 }}
            >
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{ 
                mx: 1, 
                borderRadius: 1,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
