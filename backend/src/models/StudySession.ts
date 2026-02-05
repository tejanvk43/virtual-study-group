import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IGroup } from './Group';

export interface IStudySession extends Document {
  title: string;
  description: string;
  group: IGroup['_id'];
  host: IUser['_id'];
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  type: 'study' | 'discussion' | 'presentation' | 'exam-prep' | 'project-work';
  maxParticipants?: number;
  participants: Array<{
    user: IUser['_id'];
    joinedAt: Date;
    leftAt?: Date;
  }>;
  agenda: Array<{
    topic: string;
    duration: number;
    completed: boolean;
  }>;
  resources: Array<{
    title: string;
    type: 'file' | 'link' | 'note';
    url: string;
    uploadedBy: IUser['_id'];
    uploadedAt: Date;
  }>;
  recording?: {
    isRecorded: boolean;
    url?: string;
    duration?: number;
  };
  feedback: Array<{
    user: IUser['_id'];
    rating: number;
    comment: string;
    submittedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StudySessionSchema = new Schema<IStudySession>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  actualStart: { type: Date },
  actualEnd: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled',
    required: true
  },
  type: {
    type: String,
    enum: ['study', 'discussion', 'presentation', 'exam-prep', 'project-work'],
    required: true
  },
  maxParticipants: { type: Number },
  participants: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date }
  }],
  agenda: [{
    topic: { type: String, required: true },
    duration: { type: Number, required: true },
    completed: { type: Boolean, default: false }
  }],
  resources: [{
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['file', 'link', 'note'],
      required: true
    },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, required: true }
  }],
  recording: {
    isRecorded: { type: Boolean, default: false },
    url: String,
    duration: Number
  },
  feedback: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    submittedAt: { type: Date, required: true }
  }]
}, {
  timestamps: true
});

// Add indexes for common queries
StudySessionSchema.index({ scheduledStart: 1 });
StudySessionSchema.index({ status: 1 });
StudySessionSchema.index({ group: 1 });
StudySessionSchema.index({ host: 1 });
StudySessionSchema.index({ 'participants.user': 1 });

export default mongoose.model<IStudySession>('StudySession', StudySessionSchema);
