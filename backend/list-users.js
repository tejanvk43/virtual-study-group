const mongoose = require('mongoose');
const User = require('./models/User');

const findUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all users
    const users = await User.find({}, { username: 1, firstName: 1, lastName: 1, studyStats: 1 });
    
    console.log(`\n📋 Found ${users.length} users:\n`);
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Study Time: ${user.studyStats?.totalStudyTime || 0} minutes\n`);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

findUsers();
