const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Group = require('./models/Group');
const StudySession = require('./models/StudySession');
const Message = require('./models/Message');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB. Cleaning existing data...');
    
    // Clear existing data to avoid duplicates
    await User.deleteMany({});
    await Group.deleteMany({});
    await StudySession.deleteMany({});
    await Message.deleteMany({});
    
    console.log('Creating seed data...');
    
    // Create sample users (only for development/testing)
    const users = [];
    const userNames = [
      { firstName: 'Alice', lastName: 'Johnson', username: 'alice_j', email: 'alice@example.com' },
      { firstName: 'Bob', lastName: 'Smith', username: 'bob_smith', email: 'bob@example.com' },
      { firstName: 'Carol', lastName: 'Davis', username: 'carol_d', email: 'carol@example.com' },
      { firstName: 'David', lastName: 'Wilson', username: 'david_w', email: 'david@example.com' },
      { firstName: 'Emma', lastName: 'Brown', username: 'emma_b', email: 'emma@example.com' }
    ];
    
    console.log('Creating users...');
    for (const userData of userNames) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const user = new User({
        ...userData,
        password: hashedPassword,
        bio: `Hi! I'm ${userData.firstName}, passionate about learning and collaboration.`,
        studyPreferences: {
          subjects: ['Mathematics', 'Science', 'Programming'],
          studyHours: { start: '09:00', end: '17:00' },
          timezone: 'UTC'
        },
        studyStats: {
          totalStudyTime: Math.floor(Math.random() * 500) + 100,
          sessionsCompleted: Math.floor(Math.random() * 50) + 10,
          streak: Math.floor(Math.random() * 15) + 1,
          achievements: ['first-session', 'study-streak']
        }
      });
      await user.save();
      users.push(user);
    }
    
    // Create sample groups
    console.log('Creating study groups...');
    const groups = [];
    const groupData = [
      {
        name: 'JavaScript Masters',
        description: 'Advanced JavaScript concepts and frameworks',
        subject: 'Programming',
        category: 'professional',
        privacy: 'public',
        maxMembers: 20
      },
      {
        name: 'Calculus Study Circle',
        description: 'Mastering derivatives, integrals, and limits together',
        subject: 'Mathematics',
        category: 'academic',
        privacy: 'public',
        maxMembers: 15
      },
      {
        name: 'Physics Lab Partners',
        description: 'Exploring quantum mechanics and relativity',
        subject: 'Science',
        category: 'academic',
        privacy: 'public',
        maxMembers: 12
      },
      {
        name: 'React Developers',
        description: 'Building modern web applications with React',
        subject: 'Programming',
        category: 'professional',
        privacy: 'public',
        maxMembers: 25
      },
      {
        name: 'Data Science Enthusiasts',
        description: 'Python, machine learning, and statistical analysis',
        subject: 'Data Science',
        category: 'certification',
        privacy: 'public',
        maxMembers: 18
      }
    ];
    
    for (let i = 0; i < groupData.length; i++) {
      const group = new Group({
        ...groupData[i],
        owner: users[i % users.length]._id,
        members: [
          {
            user: users[i % users.length]._id,
            role: 'owner',
            joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          }
        ]
      });
      
      // Add random members to each group
      const numMembers = Math.floor(Math.random() * 3) + 2;
      for (let j = 0; j < numMembers; j++) {
        const randomUser = users[(i + j + 1) % users.length];
        if (!group.members.some(m => m.user.toString() === randomUser._id.toString())) {
          group.members.push({
            user: randomUser._id,
            role: 'member',
            joinedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
          });
        }
      }
      
      group.memberCount = group.members.length;
      await group.save();
      groups.push(group);
    }
    
    // Create sample study sessions
    console.log('Creating study sessions...');
    const sessions = [];
    const sessionTitles = [
      'Morning Math Review',
      'JavaScript Deep Dive',
      'Physics Problem Solving',
      'React Hooks Workshop',
      'Data Analysis with Python',
      'Calculus Integration Practice',
      'Web Development Bootcamp',
      'Machine Learning Basics'
    ];
    
    for (let i = 0; i < 8; i++) {
      const randomGroup = groups[Math.floor(Math.random() * groups.length)];
      const randomHost = randomGroup.members[0].user;
      const startTime = new Date();
      
      // Create mix of past, present, and future sessions
      if (i < 3) {
        // Past sessions
        startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 7) - 1);
      } else if (i < 5) {
        // Current/active sessions
        startTime.setHours(startTime.getHours() - 1);
      } else {
        // Future sessions
        startTime.setDate(startTime.getDate() + Math.floor(Math.random() * 7) + 1);
      }
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 3) + 1);
      
      const session = new StudySession({
        title: sessionTitles[i],
        description: `Collaborative study session for ${randomGroup.name}`,
        host: randomHost,
        group: randomGroup._id,
        scheduledStart: startTime,
        scheduledEnd: endTime,
        status: i < 3 ? 'completed' : (i < 5 ? 'live' : 'scheduled'),
        participants: randomGroup.members.slice(0, Math.floor(Math.random() * 3) + 1).map(member => ({
          user: member.user,
          joinedAt: startTime,
          duration: i < 3 ? Math.floor(Math.random() * 120) + 30 : 0
        })),
        maxParticipants: 10
      });
      
      if (i < 3) {
        session.actualStart = startTime;
        session.actualEnd = endTime;
      } else if (i < 5) {
        session.actualStart = startTime;
      }
      
      await session.save();
      sessions.push(session);
    }
    
    // Create sample messages
    console.log('Creating messages...');
    const messageTexts = [
      "Hey everyone! Looking forward to studying together today.",
      "Can someone explain this concept to me?",
      "Great session today, thanks everyone!",
      "I found this resource really helpful: https://example.com",
      "Let's schedule another session next week",
      "Does anyone have notes from the last meeting?",
      "I'm struggling with this problem, can anyone help?",
      "Thanks for the explanation, that makes so much sense now!",
      "Our study group is really making a difference in my understanding",
      "See you all at the next session!"
    ];
    
    for (const group of groups) {
      // Create 5-10 messages per group
      const numMessages = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < numMessages; i++) {
        const randomMember = group.members[Math.floor(Math.random() * group.members.length)];
        const randomText = messageTexts[Math.floor(Math.random() * messageTexts.length)];
        
        const message = new Message({
          content: randomText,
          sender: randomMember.user,
          group: group._id,
          type: 'text',
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
        
        await message.save();
      }
    }
    
    // Update user groups references
    console.log('Updating user group references...');
    for (const group of groups) {
      for (const member of group.members) {
        await User.findByIdAndUpdate(
          member.user,
          { $push: { groups: group._id } }
        );
      }
    }
    
    console.log('✅ Seed data created successfully!');
    console.log(`Created:`);
    console.log(`- ${users.length} users`);
    console.log(`- ${groups.length} study groups`);
    console.log(`- ${sessions.length} study sessions`);
    console.log(`- Messages in each group`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating seed data:', error);
    process.exit(1);
  }
};

seedData();