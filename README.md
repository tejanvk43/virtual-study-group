# Virtual Study Group Platform

A comprehensive AI-powered virtual study group platform that enables collaborative learning through real-time communication, study sessions, AI assistance, and interactive tools.

## Features

### Core Features
- **User Authentication & Profiles**: Secure registration/login with customizable user profiles and study preferences
- **Study Groups**: Create, join, and manage study groups with different privacy levels and subjects
- **Real-time Chat**: Instant messaging with emoji reactions, file sharing, and message editing
- **AI Study Assistant**: Integrated AI help for explanations, study plans, quiz generation, and concept clarification
- **Study Sessions**: Schedule, host, and participate in live study sessions with agenda management
- **Interactive Whiteboard**: Collaborative drawing and note-taking during sessions
- **Progress Tracking**: Study time tracking, streaks, achievements, and statistics
- **Resource Sharing**: Upload and share files, links, and notes within groups

### AI-Powered Features
- **Study Assistant**: Ask questions and get intelligent responses contextual to your study group
- **Study Plan Generation**: AI-generated personalized study plans based on subjects and goals
- **Concept Explanations**: Get detailed explanations of complex topics with examples
- **Quiz Generation**: Auto-generate quizzes for practice and assessment
- **Session Insights**: AI analysis of study sessions with key topics and recommendations

### Collaboration Features
- **Real-time Communication**: WebSocket-based instant messaging and notifications
- **Screen Sharing**: Share your screen during study sessions
- **Collaborative Notes**: Shared note-taking during sessions
- **Group Management**: Role-based permissions (owner, moderator, member)
- **Session Recording**: Optional recording of study sessions for later review

## Technology Stack

### Backend
- **Node.js** with **Express.js** - Server framework
- **MongoDB** with **Mongoose** - Database and ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **OpenAI API** - AI features
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

### Frontend
- **React 18** with **TypeScript** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Zustand** - State management
- **React Query** - Server state management
- **Socket.IO Client** - Real-time communication
- **Fabric.js** - Whiteboard functionality
- **Axios** - HTTP client

## Project Structure

```
virtual-study-group/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── server.js        # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── stores/      # Zustand stores
│   │   ├── services/    # API services
│   │   ├── contexts/    # React contexts
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main app component
│   └── package.json
└── package.json         # Root package.json

```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd "c:\Users\pteja\OneDrive\Desktop\virtual study group\final"
   npm run install-deps
   ```

2. **Backend Configuration:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   Edit `.env` file with your configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017/study-group
   JWT_SECRET=your-super-secret-jwt-key
   OPENAI_API_KEY=your-openai-api-key (optional)
   CLIENT_URL=http://localhost:3000
   PORT=5000
   ```

3. **Start Development Servers:**
   ```bash
   # From root directory
   npm run dev
   ```
   This will start both backend (port 5000) and frontend (port 3000) concurrently.

### Individual Server Startup

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Groups
- `GET /api/groups/public` - Get public groups
- `GET /api/groups/my-groups` - Get user's groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/join` - Join group
- `POST /api/groups/:id/leave` - Leave group

### Chat
- `GET /api/chat/group/:groupId` - Get group messages
- `POST /api/chat/send` - Send message
- `PUT /api/chat/:messageId` - Edit message
- `DELETE /api/chat/:messageId` - Delete message

### AI Features
- `POST /api/ai/study-assistant` - AI study help
- `POST /api/ai/study-plan` - Generate study plan
- `POST /api/ai/explain` - Explain concepts
- `POST /api/ai/quiz` - Generate quiz

### Study Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/group/:groupId` - Get group sessions
- `GET /api/sessions/my-sessions` - Get user sessions
- `POST /api/sessions/:id/join` - Join session
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/end` - End session

## Key Features Walkthrough

### 1. User Registration & Authentication
- Secure registration with validation
- JWT-based authentication
- Persistent login sessions
- User profile management

### 2. Study Group Management
- Create groups with different privacy levels
- Invite system with unique codes
- Role-based permissions
- Group statistics and analytics

### 3. Real-time Communication
- Instant messaging with Socket.IO
- Message reactions and replies
- File and image sharing
- Online status indicators

### 4. AI Study Assistant
- Context-aware responses
- Study plan generation
- Concept explanations
- Practice quiz creation

### 5. Study Sessions
- Scheduled and impromptu sessions
- Interactive whiteboard
- Screen sharing capabilities
- Session recording and notes

### 6. Progress Tracking
- Study time logging
- Achievement system
- Streak tracking
- Performance analytics

## Future Enhancements

- Video/audio calling integration
- Mobile app development
- Advanced AI tutoring features
- Gamification elements
- Integration with external learning platforms
- Offline mode support
- Advanced analytics dashboard

## Contributing

This is a demonstration project showcasing a full-stack application with modern technologies and AI integration. The codebase follows best practices for:

- TypeScript usage
- Component architecture
- State management
- API design
- Real-time communication
- AI integration
- Security practices

## License

MIT License - This is an educational project demonstrating modern web development practices.

## Support

This platform demonstrates enterprise-level features including:
- Scalable architecture
- Real-time capabilities
- AI integration
- Modern UI/UX
- Comprehensive API design
- Security best practices
- Performance optimization
