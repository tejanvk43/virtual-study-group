const express = require('express');
const { body, validationResult } = require('express-validator');
const StudySession = require('../models/StudySession');
const Group = require('../models/Group');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create a study session
router.post('/', auth, [
  body('title').notEmpty().trim().escape(),
  body('groupId').notEmpty(),
  body('scheduledStart').isISO8601(),
  body('scheduledEnd').isISO8601(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, groupId, scheduledStart, scheduledEnd, type, agenda } = req.body;

    // Verify user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const session = new StudySession({
      title,
      description,
      group: groupId,
      host: req.user._id,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      type: type || 'study',
      agenda: agenda || [],
      status: 'live', // Set to live immediately for instant calls
      actualStart: new Date() // Record when the session actually started
    });

    await session.save();
    await session.populate('host', 'username firstName lastName avatar');
    await session.populate('group', 'name subject');

    // Emit socket event to notify all group members
    const io = req.app.get('io');
    if (io && groupId) {
      // Emit to all users in the group room
      const sessionData = {
        _id: session._id,
        title: session.title,
        description: session.description,
        host: session.host,
        groupId: groupId,
        participants: session.participants,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        status: 'live'
      };
      console.log('Emitting session-started to group:', groupId, sessionData);
      io.to(`group-${groupId}`).emit('session-started', sessionData);
    }

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error creating session' });
  }
});

// Create a personal study session (without group)
router.post('/personal', auth, [
  body('title').notEmpty().trim().escape(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, startTime, endTime, isRecurring } = req.body;

    const session = new StudySession({
      title,
      description,
      host: req.user._id,
      scheduledStart: new Date(startTime),
      scheduledEnd: new Date(endTime),
      type: 'study',
      agenda: [],
      status: 'live' // Start personal sessions immediately
    });

    await session.save();
    await session.populate('host', 'username firstName lastName avatar');

    res.status(201).json(session);
  } catch (error) {
    console.error('Create personal session error:', error);
    res.status(500).json({ message: 'Server error creating personal session' });
  }
});

// Get upcoming sessions
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Get all groups where user is a member
    const userGroups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(group => group._id);
    
    // Find sessions that are upcoming OR currently live
    const sessions = await StudySession.find({
      group: { $in: groupIds },
      $or: [
        { scheduledStart: { $gte: now }, status: { $ne: 'cancelled' } },
        { status: 'live' }
      ]
    })
      .populate('group', 'name description')
      .populate('host', 'username firstName lastName avatar')
      .populate('participants.user', 'username firstName lastName avatar')
      .sort({ scheduledStart: 1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    console.error('Get upcoming sessions error:', error);
    res.status(500).json({ message: 'Server error fetching upcoming sessions' });
  }
});

// Get past sessions
router.get('/past', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Get all groups where user is a member
    const userGroups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(group => group._id);
    
    const sessions = await StudySession.find({
      group: { $in: groupIds },
      scheduledEnd: { $lt: now }
    })
      .populate('group', 'name description')
      .populate('host', 'username firstName lastName avatar')
      .populate('participants.user', 'username firstName lastName avatar')
      .sort({ scheduledEnd: -1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    console.error('Get past sessions error:', error);
    res.status(500).json({ message: 'Server error fetching past sessions' });
  }
});

// Get sessions for a group
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { status, upcoming } = req.query;

    // Verify user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let query = { group: groupId };
    
    if (status) {
      query.status = status;
    }
    
    if (upcoming === 'true') {
      query.scheduledStart = { $gte: new Date() };
    }

    const sessions = await StudySession.find(query)
      .populate('host', 'username firstName lastName avatar')
      .populate('participants.user', 'username firstName lastName avatar')
      .sort({ scheduledStart: 1 });

    res.json(sessions);
  } catch (error) {
    console.error('Get group sessions error:', error);
    res.status(500).json({ message: 'Server error fetching sessions' });
  }
});

// Get user's sessions
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const { status } = req.query;

    let query = {
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    };

    if (status) {
      query.status = status;
    }

    const sessions = await StudySession.find(query)
      .populate('host', 'username firstName lastName avatar')
      .populate('group', 'name subject')
      .sort({ scheduledStart: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ message: 'Server error fetching user sessions' });
  }
});

// Get session by ID
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StudySession.findById(sessionId)
      .populate('host', 'username firstName lastName avatar')
      .populate('group', 'name subject members')
      .populate('participants.user', 'username firstName lastName avatar');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // If session has a group, check if user is a member
    if (session.group) {
      const isMember = session.group.members.some(member => 
        member.user && member.user.toString() === req.user._id.toString()
      );

      if (!isMember) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      // Personal session - only host can access
      if (session.host._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Server error fetching session' });
  }
});

// Join a session
router.post('/:sessionId/join', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StudySession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host or already a participant
    if (session.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You are the host of this session' });
    }
    
    const isParticipant = session.participants.some(participant => 
      participant.user.toString() === req.user._id.toString()
    );

    if (isParticipant) {
      return res.status(400).json({ message: 'Already joined this session' });
    }

    // Add user as participant
    session.participants.push({
      user: req.user._id,
      joinedAt: new Date()
    });

    await session.save();
    await session.populate('participants.user', 'username firstName lastName avatar');

    res.json({ message: 'Successfully joined session', session });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ message: 'Server error joining session' });
  }
});

// Start a session
router.post('/:sessionId/start', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StudySession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can start the session' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ message: 'Session cannot be started' });
    }

    session.status = 'live';
    session.actualStart = new Date();

    await session.save();

    // Update group stats
    await Group.findByIdAndUpdate(session.group, {
      $inc: { 'stats.totalSessions': 1 }
    });

    res.json({ message: 'Session started successfully', session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Server error starting session' });
  }
});

// End a session
router.post('/:sessionId/end', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes, aiInsights } = req.body;

    const session = await StudySession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can end the session' });
    }

    if (session.status !== 'live') {
      return res.status(400).json({ message: 'Session is not currently live' });
    }

    session.status = 'completed';
    session.actualEnd = new Date();
    
    if (notes) {
      session.notes.content = notes;
      session.notes.lastUpdated = new Date();
    }

    if (aiInsights) {
      session.aiInsights = aiInsights;
    }

    // Update participant durations
    session.participants.forEach(participant => {
      if (participant.joinedAt && !participant.leftAt) {
        participant.leftAt = new Date();
        participant.duration = Math.round((participant.leftAt - participant.joinedAt) / (1000 * 60));
      }
    });

    await session.save();

    const duration = session.calculateDuration();

    // Update group stats
    await Group.findByIdAndUpdate(session.group, {
      $inc: { 'stats.totalStudyTime': duration }
    });

    // Update participants' study time
    for (const participant of session.participants) {
      if (participant.duration > 0) {
        await User.findByIdAndUpdate(participant.user, {
          $inc: { 
            'studyStats.totalStudyTime': participant.duration,
            'studyStats.sessionsCompleted': 1
          }
        });
      }
    }

    // Emit socket event to notify all participants and group members
    const io = req.app.get('io');
    if (io) {
      // Notify group members if session has a group
      if (session.group) {
        io.to(`group-${session.group}`).emit('session-ended', {
          _id: session._id,
          groupId: session.group,
          title: session.title,
          endTime: new Date()
        });
      }
      // Also notify participants who might not be in the group room
      session.participants.forEach(participant => {
        io.to(`user-${participant.user}`).emit('session-force-end', {
          sessionId: session._id,
          message: 'The session host has ended the session'
        });
      });
    }

    res.json({ message: 'Session ended successfully', session, duration });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error ending session' });
  }
});

// Update session notes
router.put('/:sessionId/notes', auth, [
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { content } = req.body;

    const session = await StudySession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is a participant or host
    const isParticipant = session.participants.some(participant => 
      participant.user.toString() === req.user._id.toString()
    ) || session.host.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    session.notes.content = content;
    session.notes.lastUpdated = new Date();
    
    // Add user to collaborators if not already there
    if (!session.notes.collaborators.includes(req.user._id)) {
      session.notes.collaborators.push(req.user._id);
    }

    await session.save();

    res.json({ message: 'Notes updated successfully', notes: session.notes });
  } catch (error) {
    console.error('Update session notes error:', error);
    res.status(500).json({ message: 'Server error updating notes' });
  }
});

// Update a study session
router.put('/:sessionId', auth, [
  body('title').optional().notEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  body('scheduledStart').optional().isISO8601(),
  body('scheduledEnd').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await StudySession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only session host can update the session' });
    }

    // Check if session has already started
    if (session.status === 'active' || session.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update session that has already started' });
    }

    // Update session
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        if (key === 'scheduledStart' || key === 'scheduledEnd') {
          session[key] = new Date(updates[key]);
        } else {
          session[key] = updates[key];
        }
      }
    });

    await session.save();

    await session.populate('group', 'name description');
    await session.populate('host', 'username firstName lastName avatar');
    await session.populate('participants.user', 'username firstName lastName avatar');

    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ message: 'Server error updating session' });
  }
});

// Cancel/Delete a study session
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only session host can cancel the session' });
    }

    // Check if session has already completed
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed session' });
    }

    // Update session status to cancelled instead of deleting
    session.status = 'cancelled';
    await session.save();

    res.json({ message: 'Session cancelled successfully' });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({ message: 'Server error cancelling session' });
  }
});

// Leave a study session
router.post('/:sessionId/leave', auth, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user is the host
    if (session.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Host cannot leave session. Cancel or transfer hosting first.' });
    }

    // Remove user from participants
    session.participants = session.participants.filter(participant => 
      participant.user.toString() !== req.user._id.toString()
    );

    await session.save();

    res.json({ message: 'Successfully left session' });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({ message: 'Server error leaving session' });
  }
});

module.exports = router;
