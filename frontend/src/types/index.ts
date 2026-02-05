export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  birthDate?: string;
  website?: string;
  interests?: string[];
  studyPreferences: {
    subjects: string[];
    studyHours: {
      start: string;
      end: string;
    };
    timezone: string;
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  };
  groups: string[];
  studyStats: {
    totalStudyTime: number;
    sessionsCompleted: number;
    streak: number;
    achievements: string[];
  };
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  subject: string;
  category: 'academic' | 'professional' | 'hobby' | 'certification';
  privacy: 'public' | 'private' | 'invite-only';
  maxMembers: number;
  owner: User;
  moderators: User[];
  members: GroupMember[];
  inviteCode: string;
  schedule: {
    regularMeetings: Meeting[];
    timezone: string;
  };
  resources: Resource[];
  settings: GroupSettings;
  stats: {
    totalSessions: number;
    totalStudyTime: number;
    messagesCount: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  user: User;
  joinedAt: Date;
  role: 'member' | 'moderator' | 'owner';
}

export interface Meeting {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string;
  duration: number;
}

export interface Resource {
  title: string;
  type: 'file' | 'link' | 'note';
  url: string;
  uploadedBy: User;
  uploadedAt: Date;
}

export interface GroupSettings {
  allowFileSharing: boolean;
  allowScreenSharing: boolean;
  allowRecording: boolean;
  aiAssistanceEnabled: boolean;
  whiteboardEnabled: boolean;
}

export interface Message {
  _id: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'ai-response' | 'system';
  sender?: User;
  group: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: Message;
  reactions: MessageReaction[];
  edited: {
    isEdited: boolean;
    editedAt?: Date;
    originalContent?: string;
  };
  aiContext?: {
    isAIGenerated: boolean;
    prompt?: string;
    model?: string;
    confidence?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReaction {
  user: User;
  emoji: string;
}

export interface StudySession {
  _id: string;
  title: string;
  description: string;
  group: Group;
  host: User;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  type: 'study' | 'discussion' | 'presentation' | 'exam-prep' | 'project-work';
  participants: SessionParticipant[];
  agenda: AgendaItem[];
  resources: Resource[];
  recording?: {
    isRecorded: boolean;
    url?: string;
    duration?: number;
  };
  whiteboard?: {
    data: string;
    lastUpdated: Date;
  };
  notes?: {
    content: string;
    collaborators: User[];
    lastUpdated: Date;
  };
  feedback: SessionFeedback[];
  aiInsights?: {
    summary: string;
    keyTopics: string[];
    recommendations: string[];
    participationStats: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionParticipant {
  user: User;
  joinedAt: Date;
  leftAt?: Date;
  duration?: number;
}

export interface AgendaItem {
  topic: string;
  duration: number;
  completed: boolean;
}

export interface SessionFeedback {
  user: User;
  rating: number;
  comment: string;
  submittedAt: Date;
}

export interface AIResponse {
  response: string;
  messageId: string;
}

export interface StudyPlan {
  content?: string;
  [key: string]: any;
}

export interface Quiz {
  questions?: QuizQuestion[];
  content?: string;
}

export interface QuizQuestion {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

// Dashboard specific types
export interface DashboardGroup {
  id: string;
  name: string;
  subject: string;
  memberCount: number;
  lastActivity: Date;
}

export interface DashboardSession {
  id: string;
  title: string;
  groupName: string;
  time: Date;
  host?: string;
}

export interface DashboardStats {
  totalStudyTime: number;
  sessionsCompleted: number;
  currentStreak: number;
  achievements: string[];
}

export interface DashboardData {
  recentGroups: DashboardGroup[];
  upcomingSessions: DashboardSession[];
  stats: DashboardStats;
  todayProgress: number;
  weekProgress: number;
  weeklyGoal: number;
}

// Profile specific types
export interface Achievement {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  earned?: boolean;
  earnedDate?: Date;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  timestamp: Date;
  group?: string;
}

export interface StudyProgressItem {
  subject: string;
  progress: number;
  totalTime: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}
