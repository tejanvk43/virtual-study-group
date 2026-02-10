const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize Google Generative AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Use gemini-2.0-flash-lite (fast, efficient, less likely to hit rate limits)
const GEMINI_MODEL = 'gemini-2.0-flash-lite';

if (genAI) {
  console.log('✅ Google Gemini AI client initialized (model: ' + GEMINI_MODEL + ')');
} else {
  console.warn('⚠️ Google Gemini AI client NOT initialized - GEMINI_API_KEY not set in .env');
}

// Helper: call Gemini with retry on rate limit
async function callGemini(prompt, retries = 2) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      const is429 = error.message && error.message.includes('429');
      const isDailyLimit = error.message && error.message.includes('limit: 0');
      
      if (isDailyLimit) {
        throw new Error('QUOTA_EXHAUSTED: Daily free tier quota exhausted. Please wait until tomorrow or upgrade your Gemini API plan at https://ai.google.dev/pricing');
      }
      
      if (is429 && attempt < retries) {
        const waitSec = 10 * (attempt + 1);
        console.log(`⏳ Rate limited, waiting ${waitSec}s before retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
      } else {
        throw error;
      }
    }
  }
}

// Personal AI Study Assistant (no group required)
router.post('/study-assistant', auth, [
  body('message').notEmpty().trim(),
  body('groupId').optional(),
  body('context').optional()
], async (req, res) => {
  try {
    console.log('💬 Study assistant request from user:', req.user._id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (!genAI) {
      console.error('❌ Gemini client not initialized');
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure Gemini API key.' 
      });
    }

    const { message, groupId, context } = req.body;
    console.log('📝 Message:', message.substring(0, 50) + '...');
    
    let groupContext = '';

    // If groupId provided, verify membership and get context
    if (groupId && groupId !== 'default') {
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
      groupContext = recentMessages.reverse().map(msg => {
        if (msg.type === 'ai-response') {
          return `AI Assistant: ${msg.content}`;
        } else if (msg.sender) {
          return `${msg.sender.firstName}: ${msg.content}`;
        }
        return msg.content;
      }).join('\n');
    }

    const systemPrompt = `You are an AI study assistant helping students learn effectively. 
    Be helpful, encouraging, and educational. Provide clear explanations and examples when appropriate.
    Keep responses concise but informative (300-500 words for detailed answers, shorter for quick answers).
    If asked about complex topics, break them down into manageable parts.
    Use examples, analogies, and real-world applications to make concepts relatable.
    When uncertain, acknowledge limitations and suggest alternative resources.
    ${groupContext ? `Group context: ${groupContext}\n` : ''}
    ${context ? `Additional context: ${context}` : ''}`;

    const fullMessage = systemPrompt + '\n\nUser message: ' + message;
    
    console.log('🔄 Calling Gemini API for chat...');
    const aiResponse = await callGemini(fullMessage);
    console.log('✅ AI response generated, length:', aiResponse.length);

    // Save AI response as a message if in group context
    if (groupId && groupId !== 'default') {
      const aiMessage = new Message({
        content: aiResponse,
        type: 'ai-response',
        group: groupId,
        aiContext: {
          isAIGenerated: true,
          prompt: message,
          model: GEMINI_MODEL,
          confidence: 0.85
        }
      });
      await aiMessage.save();
    }

    res.json({
      response: aiResponse,
      success: true
    });

  } catch (error) {
    console.error('❌ AI assistant error:', error.message);
    console.error('Error details:', {
      code: error.code,
      status: error.status,
      type: error.type,
    });
    res.status(500).json({ message: 'Error processing AI request', error: error.message });
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

    if (!genAI) {
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure Gemini API key.' 
      });
    }

    const { subject, duration, difficulty, goals } = req.body;

    const prompt = `Create a detailed ${duration}-day study plan for ${subject} at ${difficulty} level.
    ${goals && goals.length > 0 ? `Goals: ${goals.join(', ')}` : ''}
    
    Return ONLY valid JSON in this format (no other text):
    {
      "title": "Study Plan Title",
      "duration": ${duration},
      "difficulty": "${difficulty}",
      "overview": "Brief overview",
      "days": [
        {
          "day": 1,
          "topics": ["topic1", "topic2"],
          "objectives": ["objective1", "objective2"],
          "studyTime": "2-3 hours",
          "exercises": ["exercise1"]
        }
      ]
    }`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    console.log('🔄 Calling Gemini API for study plan...');
    const result = await model.generateContent(prompt);
    const genResponse = await result.response;
    const responseText = genResponse.text().trim();
    
    console.log('✅ Gemini response received, length:', responseText.length);

    let studyPlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        studyPlan = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON found in study plan response:', responseText);
        return res.status(500).json({ 
          message: 'Failed to parse study plan',
          response: responseText 
        });
      }
    } catch (parseError) {
      console.error('Study plan JSON parse error:', parseError.message);
      return res.status(500).json({ 
        message: 'Invalid JSON from AI',
        error: parseError.message,
        response: responseText 
      });
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
    console.log('💡 Explain concept request:', req.body.concept.substring(0, 50));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (!genAI) {
      console.error('❌ Gemini client not initialized');
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure Gemini API key.' 
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    console.log('🔄 Calling Gemini API for explanation...');
    const result = await model.generateContent(prompt);
    const genResponse = await result.response;
    const explanation = genResponse.text();
    console.log('✅ Explanation generated, length:', explanation.length);

    res.json({ explanation });

  } catch (error) {
    console.error('❌ Concept explanation error:', error.message);
    console.error('Error details:', {
      code: error.code,
      status: error.status,
      type: error.type,
    });
    res.status(500).json({ message: 'Error generating explanation', error: error.message });
  }
});

// Generate quiz questions
router.post('/generate-quiz', auth, [
  body('topic').notEmpty().trim(),
  body('questionCount').isInt({ min: 1, max: 20 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('questionType').optional().isIn(['multiple-choice', 'true-false', 'short-answer', 'mixed'])
], async (req, res) => {
  try {
    console.log('📝 Quiz generation request:', { topic: req.body.topic, questionCount: req.body.questionCount });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (!genAI) {
      console.error('❌ Gemini client not initialized');
      return res.status(503).json({ 
        message: 'AI service unavailable. Please configure Gemini API key.' 
      });
    }

    const { topic, questionCount, difficulty = 'medium', questionType = 'multiple-choice' } = req.body;

    const prompt = `Generate exactly ${questionCount} ${difficulty} ${questionType} questions about ${topic}.

Return ONLY valid JSON in this exact format (no other text):
{
  "questions": [
    {
      "question": "Question text here?",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this answer is correct"
    }
  ]
}

Important: Return ONLY the JSON, nothing else. Make sure all JSON is valid.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('🔄 Calling Gemini API for quiz...');
    const result = await model.generateContent(prompt);
    const genResponse = await result.response;
    const responseText = genResponse.text().trim();
    console.log('✅ Gemini response received, length:', responseText.length);
    
    let quiz;
    try {
      // Try to find and parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
        console.log('✅ Quiz parsed successfully:', { questionsCount: quiz.questions?.length });
      } else {
        console.error('❌ No JSON found in response:', responseText.substring(0, 200));
        return res.status(500).json({ 
          message: 'Failed to parse quiz response',
          response: responseText.substring(0, 500)
        });
      }
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Response text:', responseText.substring(0, 500));
      return res.status(500).json({ 
        message: 'Invalid JSON from AI',
        error: parseError.message,
        response: responseText.substring(0, 500)
      });
    }

    res.json(quiz);

  } catch (error) {
    console.error('❌ Quiz generation error:', error.message);
    console.error('Error details:', {
      code: error.code,
      status: error.status,
      type: error.type,
    });
    res.status(500).json({ 
      message: 'Error generating quiz',
      error: error.message 
    });
  }
});

module.exports = router;
