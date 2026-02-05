import express from 'express';
import { authenticateToken } from '../middleware/auth';
import StudySession from '../models/StudySession';
import Group from '../models/Group';
import User from '../models/User';

const router = express.Router();

// Get upcoming study sessions
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const sessions = await StudySession.find({
      scheduledStart: { $gt: new Date() },
      status: 'scheduled'
    })
    .populate('host', 'firstName lastName avatar')
    .populate('group', 'name')
    .populate('participants.user', 'firstName lastName avatar')
    .sort({ scheduledStart: 1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming sessions' });
  }
});

// Get past study sessions
router.get('/past', authenticateToken, async (req, res) => {
  try {
    const sessions = await StudySession.find({
      scheduledEnd: { $lt: new Date() }
    })
    .populate('host', 'firstName lastName avatar')
    .populate('group', 'name')
    .populate('participants.user', 'firstName lastName avatar')
    .sort({ scheduledStart: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching past sessions:', error);
    res.status(500).json({ message: 'Failed to fetch past sessions' });
  }
});

// Get user's study sessions (where user is host or participant)
router.get('/my-sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await StudySession.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    })
    .populate('host', 'firstName lastName avatar')
    .populate('group', 'name')
    .populate('participants.user', 'firstName lastName avatar')
    .sort({ scheduledStart: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Failed to fetch user sessions' });
  }
});

// Create a new study session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, groupId, scheduledStart, scheduledEnd, type, maxParticipants } = req.body;

    // Verify group exists and user has access
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (!group.members.some(member => member.user.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You must be a member of the group to create a session' });
    }

    const session = new StudySession({
      title,
      description,
      group: groupId,
      host: req.user._id,
      scheduledStart,
      scheduledEnd,
      type,
      maxParticipants,
      participants: [{ user: req.user._id, joinedAt: new Date() }],
      status: 'scheduled'
    });

    await session.save();
    
    const populatedSession = await StudySession.findById(session._id)
      .populate('host', 'firstName lastName avatar')
      .populate('group', 'name')
      .populate('participants.user', 'firstName lastName avatar');

    res.status(201).json(populatedSession);
  } catch (error) {
    console.error('Error creating study session:', error);
    res.status(500).json({ message: 'Failed to create study session' });
  }
});

// Update a study session
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only host can update session
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can update the session' });
    }

    const updatedSession = await StudySession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
    .populate('host', 'firstName lastName avatar')
    .populate('group', 'name')
    .populate('participants.user', 'firstName lastName avatar');

    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating study session:', error);
    res.status(500).json({ message: 'Failed to update study session' });
  }
});

// Cancel a study session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only host can cancel session
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can cancel the session' });
    }

    await StudySession.findByIdAndUpdate(req.params.id, {
      status: 'cancelled',
      updatedAt: new Date()
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error cancelling study session:', error);
    res.status(500).json({ message: 'Failed to cancel study session' });
  }
});

// Join a study session
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ message: 'Cannot join a non-scheduled session' });
    }

    // Check if user is already a participant
    if (session.participants.some(p => p.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You are already a participant' });
    }

    // Check if session is full
    if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
      return res.status(400).json({ message: 'Session is full' });
    }

    session.participants.push({
      user: req.user._id,
      joinedAt: new Date()
    });

    await session.save();

    const updatedSession = await StudySession.findById(session._id)
      .populate('host', 'firstName lastName avatar')
      .populate('group', 'name')
      .populate('participants.user', 'firstName lastName avatar');

    res.json(updatedSession);
  } catch (error) {
    console.error('Error joining study session:', error);
    res.status(500).json({ message: 'Failed to join study session' });
  }
});

// Leave a study session
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Can't leave if you're the host
    if (session.host.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Host cannot leave the session' });
    }

    await StudySession.findByIdAndUpdate(req.params.id, {
      $pull: { participants: { user: req.user._id } }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving study session:', error);
    res.status(500).json({ message: 'Failed to leave study session' });
  }
});

export default router;
