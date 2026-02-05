const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'ai-response', 'system'],
    default: 'text'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type !== 'ai-response' && this.type !== 'system';
    }
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String
  }],
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    originalContent: String
  },
  aiContext: {
    isAIGenerated: { type: Boolean, default: false },
    prompt: String,
    model: String,
    confidence: Number
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
