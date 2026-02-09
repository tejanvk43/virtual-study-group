const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Group = require('./models/Group');
const StudySession = require('./models/StudySession');
const Message = require('./models/Message');

const cleanupDummyData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB. Cleaning up dummy/test data...');
    
    // Remove users with example/test emails
    const dummyEmailPatterns = [
      /@example\.com$/i,
      /test@/i,
      /dummy@/i,
      /sample@/i
    ];
    
    const dummyUsers = await User.find({
      $or: dummyEmailPatterns.map(pattern => ({ email: { $regex: pattern } }))
    });
    
    const dummyUserIds = dummyUsers.map(u => u._id);
    
    if (dummyUserIds.length > 0) {
      console.log(`Found ${dummyUserIds.length} dummy users to remove`);
      
      // Remove groups owned by dummy users
      await Group.deleteMany({ owner: { $in: dummyUserIds } });
      
      // Remove sessions hosted by dummy users
      await StudySession.deleteMany({ host: { $in: dummyUserIds } });
      
      // Remove messages from dummy users
      await Message.deleteMany({ sender: { $in: dummyUserIds } });
      
      // Remove dummy users
      await User.deleteMany({ _id: { $in: dummyUserIds } });
      
      console.log('✅ Dummy users and related data removed');
    }
    
    // Remove groups with dummy/test names
    const dummyGroupNames = [
      /^test/i,
      /^dummy/i,
      /^sample/i,
      /^example/i
    ];
    
    const dummyGroups = await Group.find({
      $or: dummyGroupNames.map(pattern => ({ name: { $regex: pattern } }))
    });
    
    const dummyGroupIds = dummyGroups.map(g => g._id);
    
    if (dummyGroupIds.length > 0) {
      console.log(`Found ${dummyGroupIds.length} dummy groups to remove`);
      
      // Remove sessions for dummy groups
      await StudySession.deleteMany({ group: { $in: dummyGroupIds } });
      
      // Remove messages in dummy groups
      await Message.deleteMany({ group: { $in: dummyGroupIds } });
      
      // Remove dummy groups
      await Group.deleteMany({ _id: { $in: dummyGroupIds } });
      
      console.log('✅ Dummy groups and related data removed');
    }
    
    // Remove sessions with dummy/test titles
    const dummySessionTitles = [
      /^test/i,
      /^dummy/i,
      /^sample/i
    ];
    
    const dummySessions = await StudySession.find({
      $or: dummySessionTitles.map(pattern => ({ title: { $regex: pattern } }))
    });
    
    const dummySessionIds = dummySessions.map(s => s._id);
    
    if (dummySessionIds.length > 0) {
      console.log(`Found ${dummySessionIds.length} dummy sessions to remove`);
      await StudySession.deleteMany({ _id: { $in: dummySessionIds } });
      console.log('✅ Dummy sessions removed');
    }
    
    // Remove messages with dummy/test content
    const dummyMessagePatterns = [
      /^test/i,
      /^dummy/i,
      /^sample/i,
      /example\.com/i
    ];
    
    const dummyMessages = await Message.find({
      $or: dummyMessagePatterns.map(pattern => ({ content: { $regex: pattern } }))
    });
    
    if (dummyMessages.length > 0) {
      console.log(`Found ${dummyMessages.length} dummy messages to remove`);
      await Message.deleteMany({ _id: { $in: dummyMessages.map(m => m._id) } });
      console.log('✅ Dummy messages removed');
    }
    
    console.log('✅ Cleanup completed successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up dummy data:', error);
    process.exit(1);
  }
};

cleanupDummyData();
