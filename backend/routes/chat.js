const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get messages for a group
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

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

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ group: groupId });

    res.json({
      messages: messages.reverse(), // Reverse to get chronological order
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalMessages: total
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// Send a message
router.post('/send', auth, [
  body('content').notEmpty().trim(),
  body('groupId').notEmpty(),
  body('type').optional().isIn(['text', 'file', 'image'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, groupId, type = 'text', replyTo } = req.body;

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

    const message = new Message({
      content,
      type,
      sender: req.user._id,
      group: groupId,
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username firstName lastName avatar');
    
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Update group stats
    await Group.findByIdAndUpdate(groupId, {
      $inc: { 'stats.messagesCount': 1 }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// Edit a message
router.put('/:messageId', auth, [
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const messageAge = Date.now() - message.createdAt.getTime();
    if (messageAge > 15 * 60 * 1000) { // 15 minutes in milliseconds
      return res.status(400).json({ message: 'Message too old to edit' });
    }

    message.edited.originalContent = message.content;
    message.content = content;
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'username firstName lastName avatar');

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error editing message' });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender or a group moderator
    const group = await Group.findById(message.group);
    const userMember = group.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    const canDelete = message.sender.toString() === req.user._id.toString() ||
                     (userMember && (userMember.role === 'moderator' || userMember.role === 'owner'));

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error deleting message' });
  }
});

// Add reaction to a message
router.post('/:messageId/react', auth, [
  body('emoji').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(reaction => 
      reaction.user.toString() === req.user._id.toString() && 
      reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(reaction => 
        !(reaction.user.toString() === req.user._id.toString() && reaction.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        user: req.user._id,
        emoji
      });
    }

    await message.save();
    await message.populate('reactions.user', 'username firstName lastName');

    res.json(message.reactions);
  } catch (error) {
    console.error('Message reaction error:', error);
    res.status(500).json({ message: 'Server error updating reaction' });
  }
});

module.exports = router;
