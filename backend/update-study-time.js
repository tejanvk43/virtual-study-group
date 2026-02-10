const mongoose = require('mongoose');
const User = require('./models/User');

const updateStudyTime = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Update Prem_Sagar's study time to 12 hours (720 minutes)
    const result = await User.findOneAndUpdate(
      { username: 'Prem_Sagar' },
      { 
        $set: { 
          'studyStats.totalStudyTime': 720 // 12 hours in minutes
        }
      },
      { new: true }
    );
    
    if (result) {
      console.log('✅ Updated Prem_Sagar successfully');
      console.log(`📊 New Study Time: ${result.studyStats.totalStudyTime} minutes (${result.studyStats.totalStudyTime / 60} hours)`);
      console.log(`📈 Sessions Completed: ${result.studyStats.sessionsCompleted}`);
      console.log(`🔥 Streak: ${result.studyStats.streak}`);
    } else {
      console.log('❌ User not found');
    }
    
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateStudyTime();
