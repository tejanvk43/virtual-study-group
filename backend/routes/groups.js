const express = require('express');
const { body, validationResult } = require('express-validator');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create a new group
router.post('/', auth, [
  body('name').notEmpty().trim().escape(),
  body('subject').notEmpty().trim(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, subject, category, privacy, maxMembers } = req.body;

    const group = new Group({
      name,
      description,
      subject,
      category: category || 'academic',
      privacy: privacy || 'public',
      maxMembers: maxMembers || 20,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });

    await group.populate('owner', 'username firstName lastName avatar');
    await group.populate('members.user', 'username firstName lastName avatar');

    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
});

// Get all public groups with pagination (excluding user's own groups)
router.get('/public', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const subject = req.query.subject || '';

    const query = { 
      privacy: 'public',
      isActive: true,
      owner: { $ne: req.user._id } // Exclude groups owned by the requesting user
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    const groups = await Group.find(query)
      .populate('owner', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Group.countDocuments(query);

    res.json({
      groups,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalGroups: total
    });
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

// Get user's groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
      .populate('owner', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error fetching user groups' });
  }
});

// Get group by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('owner', 'username firstName lastName avatar')
      .populate('members.user', 'username firstName lastName avatar studyPreferences');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member or if group is public
    const isMember = group.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember && group.privacy !== 'public') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error fetching group' });
  }
});

// Join group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: 'Group is full' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    // Add user to group
    group.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id }
    });

    // Create system message
    const systemMessage = new Message({
      content: `${req.user.firstName} ${req.user.lastName} joined the group`,
      type: 'system',
      group: group._id
    });
    await systemMessage.save();

    await group.populate('owner', 'username firstName lastName avatar');
    await group.populate('members.user', 'username firstName lastName avatar');

    res.json({ message: 'Successfully joined group', group });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error joining group' });
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the owner
    if (group.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Owner cannot leave group. Transfer ownership first.' });
    }

    // Remove user from group
    group.members = group.members.filter(member => 
      member.user.toString() !== req.user._id.toString()
    );

    await group.save();

    // Remove group from user's groups
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { groups: group._id }
    });

    // Create system message
    const systemMessage = new Message({
      content: `${req.user.firstName} ${req.user.lastName} left the group`,
      type: 'system',
      group: group._id
    });
    await systemMessage.save();

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error leaving group' });
  }
});

// Update group
router.put('/:id', auth, [
  body('name').optional().notEmpty().trim().escape(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is owner or moderator
    const userMember = group.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'moderator')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update group
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        group[key] = updates[key];
      }
    });

    await group.save();
    await group.populate('owner', 'username firstName lastName avatar');
    await group.populate('members.user', 'username firstName lastName avatar');

    res.json(group);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error updating group' });
  }
});

// Delete group
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is owner
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only group owner can delete the group' });
    }

    // Remove group from all members' groups arrays
    await User.updateMany(
      { _id: { $in: group.members.map(member => member.user) } },
      { $pull: { groups: group._id } }
    );

    // Delete all messages in the group
    await Message.deleteMany({ group: group._id });

    // Delete the group
    await Group.findByIdAndDelete(req.params.id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error deleting group' });
  }
});

module.exports = router;
