const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Group = require('./models/Group');
const StudySession = require('./models/StudySession');

const seedMarchData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📊 Connected to MongoDB');
    
    // Find or create Prem_Sagar user
    let premUser = await User.findOne({ username: 'prem_sagar' });
    
    if (!premUser) {
      console.log('⚠️ Prem_Sagar user not found. Checking for existing users...');
      premUser = await User.findOne();
      
      if (!premUser) {
        console.log('⚠️ No users found. Creating Prem_Sagar...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 12);
        
        premUser = new User({
          firstName: 'Prem',
          lastName: 'Sagar',
          username: 'prem_sagar',
          email: 'prem.sagar@example.com',
          password: hashedPassword,
          bio: 'Learning enthusiast passionate about collaborative study',
          studyPreferences: {
            subjects: ['Mathematics', 'Science', 'Programming'],
            studyHours: { start: '09:00', end: '17:00' },
            timezone: 'UTC'
          }
        });
        await premUser.save();
        console.log(`✅ Created Prem_Sagar user`);
      }
    }
    
    console.log(`✅ Using user: ${premUser.firstName} ${premUser.lastName} (${premUser.username})`);
    
    // Get other users for group members
    let users = await User.find().limit(5);
    
    if (users.length === 0) {
      console.log('⚠️ No users found. Creating test users...');
      const bcrypt = require('bcryptjs');
      
      const userNames = [
        { firstName: 'Prem', lastName: 'Sagar', username: 'prem_sagar', email: 'premsager@example.com' },
        { firstName: 'Alice', lastName: 'Johnson', username: 'alice_j', email: 'alice@example.com' },
        { firstName: 'Bob', lastName: 'Smith', username: 'bob_smith', email: 'bob@example.com' },
        { firstName: 'Carol', lastName: 'Davis', username: 'carol_d', email: 'carol@example.com' },
        { firstName: 'David', lastName: 'Wilson', username: 'david_w', email: 'david@example.com' }
      ];
      
      for (const userData of userNames) {
        const hashedPassword = await bcrypt.hash('password123', 12);
        const user = new User({
          ...userData,
          password: hashedPassword,
          bio: `Hi! I'm ${userData.firstName}, passionate about learning.`,
          studyPreferences: {
            subjects: ['Mathematics', 'Science', 'Programming'],
            studyHours: { start: '09:00', end: '17:00' },
            timezone: 'UTC'
          }
        });
        await user.save();
        users.push(user);
      }
      console.log(`✅ Created ${users.length} users`);
    }
    
    console.log(`📚 Found ${users.length} users`);
    
    // Create March Study Groups
    console.log('\n📖 Creating March Study Groups...');
    
    const marchedGroupsData = [
      {
        name: 'March Mathematics Bootcamp',
        description: 'Intensive math study for March - covering algebra, calculus, and statistics',
        subject: 'Mathematics',
        category: 'academic',
        privacy: 'public'
      },
      {
        name: 'Spring Physics Exploration',
        description: 'Physics fundamentals and applications - March sessions',
        subject: 'Physics',
        category: 'academic',
        privacy: 'public'
      },
      {
        name: 'React & Web Dev Sprint',
        description: 'Full-stack web development with React - March project sprint',
        subject: 'Computer Science',
        category: 'professional',
        privacy: 'public'
      },
      {
        name: 'Data Science March Session',
        description: 'Machine learning and data analysis - March cohort',
        subject: 'Data Science',
        category: 'certification',
        privacy: 'public'
      },
      {
        name: 'Chemistry Concepts Lab',
        description: 'Chemistry principles and experiments - March learning group',
        subject: 'Chemistry',
        category: 'academic',
        privacy: 'public'
      },
      {
        name: 'Python Programming Club',
        description: 'Learn Python from basics to advanced - March group',
        subject: 'Programming',
        category: 'professional',
        privacy: 'public'
      },
      {
        name: 'English Literature Discussion',
        description: 'Classic and modern literature analysis - March readings',
        subject: 'Literature',
        category: 'hobby',
        privacy: 'public'
      },
      {
        name: 'Business Studies Group',
        description: 'Economics, business strategy, and entrepreneurship - March focus',
        subject: 'Business',
        category: 'professional',
        privacy: 'public'
      }
    ];
    
    const marchGroups = [];
    
    for (let i = 0; i < marchedGroupsData.length; i++) {
      // Assign all groups to Prem_Sagar as owner
      const group = new Group({
        ...marchedGroupsData[i],
        owner: premUser._id,
        members: [
          {
            user: premUser._id,
            role: 'owner',
            joinedAt: new Date('2026-02-28')
          }
        ]
      });
      
      // Add 2-3 other users as members
      const numMembers = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < numMembers; j++) {
        const member = users[(i + j + 1) % users.length];
        if (member._id.toString() !== premUser._id.toString() && 
            !group.members.some(m => m.user.toString() === member._id.toString())) {
          group.members.push({
            user: member._id,
            role: 'member',
            joinedAt: new Date('2026-02-28')
          });
        }
      }
      
      await group.save();
      marchGroups.push(group);
      console.log(`✅ Created group: ${group.name} (Owner: ${premUser.firstName})`);
    }
    
    // Create March Study Sessions - 3-4 per group
    console.log('\n📅 Creating March Study Sessions...');
    
    const sessionTitles = [
      'Morning Study Session',
      'Afternoon Discussion',
      'Evening Problem Solving',
      'Advanced Concepts Workshop',
      'Quiz Preparation',
      'Project Work Session',
      'Peer Review Meeting',
      'Guest Lecture'
    ];
    
    let sessionCount = 0;
    
    for (const group of marchGroups) {
      const numSessions = Math.floor(Math.random() * 3) + 3; // 3-5 sessions per group
      const groupMembers = await Group.findById(group._id).populate('members.user');
      
      for (let s = 0; s < numSessions; s++) {
        // Random date in March 2026
        const marchDay = Math.floor(Math.random() * 28) + 1; // 1-28
        const hour = Math.floor(Math.random() * 16) + 8; // 8 AM - 11 PM
        
        const scheduledStart = new Date(2026, 1, marchDay, hour, 0); // Feb = month 1 (adjusting for 0-indexed)
        scheduledStart.setMonth(2); // Set to March (month 2)
        
        const scheduledEnd = new Date(scheduledStart);
        scheduledEnd.setHours(scheduledEnd.getHours() + (Math.floor(Math.random() * 2) + 1)); // 1-2 hour sessions
        
        // Determine session status based on date relative to today (Feb 10, 2026)
        let status = 'scheduled';
        if (marchDay < 10) {
          status = 'completed'; // Past sessions
        }
        
        const session = new StudySession({
          title: `${sessionTitles[s % sessionTitles.length]} - ${group.name}`,
          description: `Study session for ${group.name}. Topics: ${group.description.substring(0, 50)}...`,
          group: group._id,
          host: premUser._id,  // Assign Prem as host
          scheduledStart,
          scheduledEnd,
          status,
          type: ['study', 'discussion', 'presentation', 'exam-prep', 'project-work'][Math.floor(Math.random() * 5)],
          participants: [
            {
              user: premUser._id,  // Assign Prem as participant
              joinedAt: status === 'completed' ? scheduledStart : null,
              leftAt: status === 'completed' ? scheduledEnd : null,
              duration: status === 'completed' ? 60 : 0
            },
            // Add other group members
            ...groupMembers.members.slice(1, Math.floor(Math.random() * 2) + 2).map(member => ({
              user: member.user._id,
              joinedAt: status === 'completed' ? scheduledStart : null,
              leftAt: status === 'completed' ? scheduledEnd : null,
              duration: status === 'completed' ? 60 : 0
            }))
          ],
          maxParticipants: 20
        });
        
        if (status === 'completed') {
          session.actualStart = scheduledStart;
          session.actualEnd = scheduledEnd;
        }
        
        await session.save();
        sessionCount++;
      }
    }
    
    // Update user group references
    console.log('\n🔗 Linking groups to users...');
    for (const group of marchGroups) {
      for (const member of group.members) {
        await User.findByIdAndUpdate(
          member.user,
          { $addToSet: { groups: group._id } }
        );
      }
    }
    
    console.log('\n✅ ========================================');
    console.log('✅ March Data Seeding Completed!');
    console.log('✅ ========================================');
    console.log(`✅ Created ${marchGroups.length} study groups`);
    console.log(`✅ Created ${sessionCount} study sessions in March 2026`);
    console.log('✅ ========================================\n');
    
    // Display summary
    console.log('📊 March 2026 Study Groups Created:');
    for (const group of marchGroups) {
      console.log(`   • ${group.name} (Members: ${group.members.length})`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating March seed data:', error);
    process.exit(1);
  }
};

seedMarchData();
