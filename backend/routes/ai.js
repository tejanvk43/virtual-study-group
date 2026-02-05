const express = require('express');
const OpenAI = require('openai');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize OpenAI (will work when API key is provided)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// AI Study Assistant
router.post('/study-assistant', auth, [
  body('message').notEmpty().trim(),
  body('groupId').notEmpty(),
  body('context').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!openai) {
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure OpenAI API key.' 
      });
    }

    const { message, groupId, context } = req.body;

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

    // Get recent messages for context
    const recentMessages = await Message.find({ group: groupId })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    // Build context for AI
    const conversationContext = recentMessages.reverse().map(msg => {
      if (msg.type === 'ai-response') {
        return `AI Assistant: ${msg.content}`;
      } else if (msg.sender) {
        return `${msg.sender.firstName}: ${msg.content}`;
      }
      return msg.content;
    }).join('\n');

    const systemPrompt = `You are an AI study assistant helping students in a virtual study group for ${group.subject}. 
    Be helpful, encouraging, and educational. Provide clear explanations and examples when appropriate.
    Keep responses concise but informative. If asked about complex topics, break them down into manageable parts.
    
    Group context: ${group.description}
    Recent conversation:
    ${conversationContext}
    
    Additional context: ${context || 'None'}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // Save AI response as a message
    const aiMessage = new Message({
      content: aiResponse,
      type: 'ai-response',
      group: groupId,
      aiContext: {
        isAIGenerated: true,
        prompt: message,
        model: 'gpt-3.5-turbo',
        confidence: 0.85
      }
    });

    await aiMessage.save();

    res.json({
      response: aiResponse,
      messageId: aiMessage._id
    });

  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ message: 'Error processing AI request' });
  }
});

// Generate study plan
router.post('/study-plan', auth, [
  body('subject').notEmpty().trim(),
  body('duration').isInt({ min: 1, max: 365 }),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']),
  body('goals').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!openai) {
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure OpenAI API key.' 
      });
    }

    const { subject, duration, difficulty, goals } = req.body;

    const prompt = `Create a detailed ${duration}-day study plan for ${subject} at ${difficulty} level.
    ${goals && goals.length > 0 ? `Goals: ${goals.join(', ')}` : ''}
    
    Structure the plan with:
    1. Daily topics and objectives
    2. Recommended study time per day
    3. Key concepts to master
    4. Practice exercises or projects
    5. Milestones and checkpoints
    
    Format as a structured JSON with daily breakdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.5,
    });

    let studyPlan;
    try {
      studyPlan = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, return as text
      studyPlan = { content: completion.choices[0].message.content };
    }

    res.json({ studyPlan });

  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ message: 'Error generating study plan' });
  }
});

// Explain concept
router.post('/explain', auth, [
  body('concept').notEmpty().trim(),
  body('subject').optional().trim(),
  body('level').optional().isIn(['elementary', 'middle', 'high', 'college', 'graduate'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!openai) {
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure OpenAI API key.' 
      });
    }

    const { concept, subject, level } = req.body;

    const prompt = `Explain the concept "${concept}" ${subject ? `in ${subject}` : ''} 
    ${level ? `at ${level} level` : ''}.
    
    Provide:
    1. A clear, simple definition
    2. Key points or characteristics
    3. Real-world examples or applications
    4. Common misconceptions (if any)
    5. Related concepts to explore further
    
    Make it engaging and easy to understand.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.6,
    });

    const explanation = completion.choices[0].message.content;

    res.json({ explanation });

  } catch (error) {
    console.error('Concept explanation error:', error);
    res.status(500).json({ message: 'Error generating explanation' });
  }
});

// Generate quiz questions
router.post('/quiz', auth, [
  body('topic').notEmpty().trim(),
  body('questionCount').isInt({ min: 1, max: 20 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('questionType').optional().isIn(['multiple-choice', 'true-false', 'short-answer', 'mixed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!openai) {
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure OpenAI API key.' 
      });
    }

    const { topic, questionCount, difficulty = 'medium', questionType = 'multiple-choice' } = req.body;

    const prompt = `Generate ${questionCount} ${difficulty} ${questionType} questions about ${topic}.
    
    Format as JSON array with this structure:
    {
      "questions": [
        {
          "question": "Question text",
          "type": "${questionType}",
          "options": ["A", "B", "C", "D"], // for multiple choice
          "correct_answer": "A", // or correct text for other types
          "explanation": "Why this is correct"
        }
      ]
    }
    
    Make questions educational and thought-provoking.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
    });

    let quiz;
    try {
      quiz = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, return as text
      quiz = { content: completion.choices[0].message.content };
    }

    res.json(quiz);

  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: 'Error generating quiz' });
  }
});

module.exports = router;
