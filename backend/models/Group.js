const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  subject: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'professional', 'hobby', 'certification'],
    default: 'academic'
  },
  privacy: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public'
  },
  maxMembers: {
    type: Number,
    default: 20,
    min: 2,
    max: 100
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'owner'],
      default: 'member'
    }
  }],
  inviteCode: {
    type: String,
    unique: true
  },
  schedule: {
    regularMeetings: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      time: String,
      duration: Number // in minutes
    }],
    timezone: String
  },
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['file', 'link', 'note']
    },
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowFileSharing: { type: Boolean, default: true },
    allowScreenSharing: { type: Boolean, default: true },
    allowRecording: { type: Boolean, default: false },
    aiAssistanceEnabled: { type: Boolean, default: true },
    whiteboardEnabled: { type: Boolean, default: true }
  },
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 },
    messagesCount: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate invite code before saving
groupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Add member method
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    return false; // User already a member
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return true;
};

// Remove member method
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
};

module.exports = mongoose.model('Group', groupSchema);
