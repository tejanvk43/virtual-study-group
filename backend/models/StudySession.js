const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false  // Changed to allow personal sessions
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['study', 'discussion', 'presentation', 'exam-prep', 'project-work'],
    default: 'study'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date,
    duration: Number // in minutes
  }],
  agenda: [{
    topic: String,
    duration: Number, // in minutes
    completed: { type: Boolean, default: false }
  }],
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  recording: {
    isRecorded: { type: Boolean, default: false },
    url: String,
    duration: Number
  },
  whiteboard: {
    data: String, // Serialized whiteboard data
    lastUpdated: Date
  },
  notes: {
    content: String,
    collaborators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    lastUpdated: Date
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiInsights: {
    summary: String,
    keyTopics: [String],
    recommendations: [String],
    participationStats: Object
  }
}, {
  timestamps: true
});

// Index for efficient querying
studySessionSchema.index({ group: 1, scheduledStart: 1 });
studySessionSchema.index({ host: 1 });
studySessionSchema.index({ status: 1 });

// Calculate session duration
studySessionSchema.methods.calculateDuration = function() {
  if (this.actualStart && this.actualEnd) {
    return Math.round((this.actualEnd - this.actualStart) / (1000 * 60)); // in minutes
  }
  return 0;
};

module.exports = mongoose.model('StudySession', studySessionSchema);
