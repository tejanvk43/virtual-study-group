const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Group = require('../models/Group');
const StudySession = require('../models/StudySession');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Record daily activity (called on login/dashboard visit)
router.post('/record-activity', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize activityDays if it doesn't exist
    if (!user.activityDays) {
      user.activityDays = [];
    }

    // Check if today is already recorded
    if (!user.activityDays.includes(today)) {
      user.activityDays.push(today);
      
      // Update streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (user.lastActivityDate === yesterdayStr) {
        // Consecutive day - increase streak
        user.studyStats.streak = (user.studyStats.streak || 0) + 1;
      } else if (user.lastActivityDate !== today) {
        // Not consecutive - reset streak to 1
        user.studyStats.streak = 1;
      }
      
      user.lastActivityDate = today;
      await user.save();
    }

    // Calculate current streak and longest streak
    const sortedDays = [...user.activityDays].sort().reverse();
    let currentStreak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDays.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today might not be recorded yet, skip
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedAsc = [...user.activityDays].sort();
    
    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedAsc[i - 1]);
        const currDate = new Date(sortedAsc[i]);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.json({
      message: 'Activity recorded',
      activityDays: user.activityDays,
      currentStreak,
      longestStreak
    });
  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({ message: 'Server error recording activity' });
  }
});

// Get user's activity data
router.get('/activity', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activityDays lastActivityDate studyStats');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activityDays = user.activityDays || [];
    
    // Calculate current streak
    const sortedDays = [...activityDays].sort().reverse();
    let currentStreak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDays.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedAsc = [...activityDays].sort();
    
    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedAsc[i - 1]);
        const currDate = new Date(sortedAsc[i]);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.json({
      activityDays,
      currentStreak,
      longestStreak,
      totalActiveDays: activityDays.length
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

// Get current user's profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups', 'name subject privacy')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Get user profile by ID
router.get('/profile/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('groups', 'name subject privacy')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName').optional().notEmpty().trim().escape(),
  body('lastName').optional().notEmpty().trim().escape(),
  body('bio').optional().trim().escape(),
  body('studyPreferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatar', 'studyPreferences'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Get user's study statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('studyStats createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate additional stats
    const totalGroups = await Group.countDocuments({
      'members.user': req.user._id,
      isActive: true
    });

    const ownedGroups = await Group.countDocuments({
      owner: req.user._id,
      isActive: true
    });

    // Ensure studyStats exists with defaults
    const studyStats = user.studyStats || {
      totalStudyTime: 0,
      sessionsCompleted: 0,
      streak: 0,
      achievements: []
    };

    const stats = {
      ...studyStats.toObject?.() || studyStats,
      totalGroups,
      ownedGroups,
      joinDate: user.createdAt
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username firstName lastName avatar bio studyPreferences')
      .limit(parseInt(limit));

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// Update study time
router.post('/study-time', auth, [
  body('duration').isInt({ min: 1 }),
  body('sessionId').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { duration } = req.body; // duration in minutes

    const user = await User.findById(req.user._id);
    
    user.studyStats.totalStudyTime += duration;
    user.studyStats.sessionsCompleted += 1;
    
    // Update streak logic (simplified)
    const today = new Date();
    const lastStudyDate = user.lastStudyDate || new Date(0);
    const diffDays = Math.floor((today - lastStudyDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      user.studyStats.streak += 1;
    } else if (diffDays > 1) {
      user.studyStats.streak = 1;
    }
    
    user.lastStudyDate = today;

    // Check for achievements
    const achievements = [];
    if (user.studyStats.totalStudyTime >= 60 && !user.studyStats.achievements.includes('first-hour')) {
      achievements.push('first-hour');
    }
    if (user.studyStats.streak >= 7 && !user.studyStats.achievements.includes('week-streak')) {
      achievements.push('week-streak');
    }
    if (user.studyStats.sessionsCompleted >= 10 && !user.studyStats.achievements.includes('session-master')) {
      achievements.push('session-master');
    }

    user.studyStats.achievements.push(...achievements);

    await user.save();

    res.json({
      message: 'Study time updated',
      stats: user.studyStats,
      newAchievements: achievements
    });
  } catch (error) {
    console.error('Update study time error:', error);
    res.status(500).json({ message: 'Server error updating study time' });
  }
});

// Get dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('studyStats lastStudyDate');
    
    // Get recent groups (groups user is a member of, sorted by last activity)
    const recentGroups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
      .populate('owner', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name subject description memberCount updatedAt');

    // Get upcoming sessions (next 5 sessions where user is a participant)
    const upcomingSessions = await StudySession.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ],
      scheduledStart: { $gte: new Date() },
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('group', 'name')
      .populate('host', 'firstName lastName avatar')
      .sort({ scheduledStart: 1 })
      .limit(5)
      .select('title scheduledStart scheduledEnd group host status');

    // Calculate today's study time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysSessions = await StudySession.find({
      'participants.user': req.user._id,
      actualEnd: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    const todayProgress = todaysSessions.reduce((total, session) => {
      const participant = session.participants.find(p => p.user.toString() === req.user._id.toString());
      return total + (participant?.duration || 0);
    }, 0);

    // Calculate weekly goal progress
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekSessions = await StudySession.find({
      'participants.user': req.user._id,
      actualEnd: { $gte: weekStart, $lt: weekEnd },
      status: 'completed'
    });

    const weekProgress = weekSessions.reduce((total, session) => {
      const participant = session.participants.find(p => p.user.toString() === req.user._id.toString());
      return total + (participant?.duration || 0);
    }, 0);

    // Format recent groups data
    const formattedRecentGroups = recentGroups.map(group => ({
      id: group._id,
      name: group.name,
      subject: group.subject,
      memberCount: group.memberCount || 0,
      lastActivity: group.updatedAt
    }));

    // Format upcoming sessions data
    const formattedUpcomingSessions = upcomingSessions.map(session => ({
      id: session._id,
      title: session.title,
      groupName: session.group?.name || 'Unknown Group',
      time: session.scheduledStart,
      host: `${session.host?.firstName || ''} ${session.host?.lastName || ''}`.trim()
    }));

    const dashboardData = {
      recentGroups: formattedRecentGroups,
      upcomingSessions: formattedUpcomingSessions,
      stats: {
        totalStudyTime: user.studyStats?.totalStudyTime || 0,
        sessionsCompleted: user.studyStats?.sessionsCompleted || 0,
        currentStreak: user.studyStats?.streak || 0,
        achievements: user.studyStats?.achievements || [],
      },
      todayProgress, // minutes studied today
      weekProgress, // minutes studied this week
      weeklyGoal: 300, // default goal, can be made configurable per user
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

module.exports = router;
