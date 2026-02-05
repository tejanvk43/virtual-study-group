import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Tabs,
  Tab,
  Avatar,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  School as SchoolIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { groupsAPI } from '../services/api';
import { Group } from '../types';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentTab, setCurrentTab] = useState(0);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const groupsPerPage = 9;

  // Create group form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    privacy: 'public' as 'public' | 'private',
    maxMembers: 50,
  });

  const subjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Engineering',
    'Literature',
    'History',
    'Psychology',
    'Economics',
    'Business',
    'Art',
    'Music',
    'Language Learning',
    'Other',
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const [publicResponse, myResponse] = await Promise.all([
        groupsAPI.getPublicGroups(),
        groupsAPI.getUserGroups(),
      ]);
      
      // Handle different response structures
      const allPublicGroups = publicResponse.data.groups || [];
      const userGroups = myResponse.data || [];
      
      // Filter out groups owned by the current user from public groups
      const filteredPublicGroups = allPublicGroups.filter((group: Group) => 
        group.owner._id !== user?._id
      );
      
      setPublicGroups(filteredPublicGroups);
      setMyGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
      // Set empty arrays as fallback
      setPublicGroups([]);
      setMyGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name.trim()) {
        toast.error('Group name is required');
        return;
      }

      await groupsAPI.createGroup(newGroup);
      toast.success('Group created successfully!');
      setCreateDialogOpen(false);
      setNewGroup({
        name: '',
        description: '',
        subject: '',
        privacy: 'public',
        maxMembers: 50,
      });
      loadGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      await groupsAPI.joinGroup(groupId);
      toast.success('Joined group successfully!');
      loadGroups();
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.response?.data?.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      await groupsAPI.leaveGroup(groupId);
      toast.success('Left group successfully!');
      loadGroups();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      // Show confirmation dialog
      if (!window.confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone and will delete all messages in the group.`)) {
        return;
      }

      await groupsAPI.deleteGroup(groupId);
      toast.success('Group deleted successfully!');
      loadGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error(error.response?.data?.message || 'Failed to delete group');
    }
  };

  const filteredPublicGroups = (Array.isArray(publicGroups) ? publicGroups : []).filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !subjectFilter || group.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const filteredMyGroups = (Array.isArray(myGroups) ? myGroups : []).filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getCurrentPageGroups = (groups: Group[]) => {
    const startIndex = (currentPage - 1) * groupsPerPage;
    return groups.slice(startIndex, startIndex + groupsPerPage);
  };

  const getTotalPages = (groups: Group[]) => {
    return Math.ceil(groups.length / groupsPerPage);
  };

  const renderGroupCard = (group: Group, isMyGroup = false) => (
    <Grid item xs={12} sm={6} md={4} key={group._id}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
              <SchoolIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h3" noWrap>
                {group.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {group.privacy === 'private' ? (
                  <LockIcon fontSize="small" color="action" />
                ) : (
                  <PublicIcon fontSize="small" color="action" />
                )}
                <Typography variant="caption" color="text.secondary">
                  {group.privacy}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {group.description || 'No description available'}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {group.subject && (
              <Chip
                label={group.subject}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`${group.members?.length || 0}/${group.maxMembers || 50} members`}
              size="small"
              icon={<PeopleIcon />}
            />
          </Box>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/groups/${group._id}`)}
            sx={{ mr: 1 }}
          >
            View
          </Button>
          {isMyGroup ? (
            // Check if user is the owner of the group
            group.owner._id === user?._id ? (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteGroup(group._id, group.name)}
              >
                Delete
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleLeaveGroup(group._id)}
              >
                Leave
              </Button>
            )
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => handleJoinGroup(group._id)}
              disabled={group.members?.length >= (group.maxMembers || 50)}
            >
              {group.members?.length >= (group.maxMembers || 50) ? 'Full' : 'Join'}
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Study Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Group
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Subject</InputLabel>
              <Select
                value={subjectFilter}
                label="Filter by Subject"
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <MenuItem value="">All Subjects</MenuItem>
                {subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Discover Groups" />
        <Tab label="My Groups" />
      </Tabs>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {getCurrentPageGroups(filteredPublicGroups).map((group) =>
            renderGroupCard(group, false)
          )}
          {filteredPublicGroups.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No public groups found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search criteria or create a new group
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
        {filteredPublicGroups.length > groupsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={getTotalPages(filteredPublicGroups)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {getCurrentPageGroups(filteredMyGroups).map((group) =>
            renderGroupCard(group, true)
          )}
          {filteredMyGroups.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  You haven't joined any groups yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse the "Discover Groups" tab to find groups to join
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
        {filteredMyGroups.length > groupsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={getTotalPages(filteredMyGroups)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </TabPanel>

      {/* Create Group Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Study Group</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              variant="outlined"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subject</InputLabel>
              <Select
                value={newGroup.subject}
                label="Subject"
                onChange={(e) => setNewGroup({ ...newGroup, subject: e.target.value })}
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Privacy</InputLabel>
              <Select
                value={newGroup.privacy}
                label="Privacy"
                onChange={(e) => setNewGroup({ ...newGroup, privacy: e.target.value as 'public' | 'private' })}
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Max Members"
              type="number"
              fullWidth
              variant="outlined"
              value={newGroup.maxMembers}
              onChange={(e) => setNewGroup({ ...newGroup, maxMembers: parseInt(e.target.value) || 50 })}
              inputProps={{ min: 1, max: 1000 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            Create Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;
