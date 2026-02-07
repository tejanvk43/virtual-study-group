<div align="center">

# 📚 Virtual Study Group Platform

### AI-Powered Collaborative Learning Made Simple

[![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.5-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A comprehensive virtual study group platform that enables collaborative learning through real-time communication, scheduled study sessions, AI-powered assistance, and interactive collaboration tools.

[Getting Started](#-quick-start) •
[Features](#-features) •
[Documentation](#-api-documentation) •
[Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

Virtual Study Group is a full-stack web application designed to facilitate collaborative online learning. It combines real-time communication, AI-powered study assistance, and interactive tools to create an engaging educational environment.

### Why Virtual Study Group?

- **Collaborative Learning**: Study together with peers in real-time, regardless of location
- **AI-Powered Assistance**: Get instant help with concepts, generate study plans, and create practice quizzes
- **Organized Sessions**: Schedule and manage study sessions with built-in agenda management
- **Progress Tracking**: Monitor your learning journey with detailed analytics and achievements

---

## ✨ Features

### 🔐 Authentication & User Management
| Feature | Description |
|---------|-------------|
| Secure Registration | Email-based signup with validation |
| JWT Authentication | Token-based secure sessions |
| User Profiles | Customizable profiles with study preferences |
| Session Persistence | Remember me functionality |

### 👥 Study Groups
| Feature | Description |
|---------|-------------|
| Group Creation | Create public or private study groups |
| Subject Organization | Categorize groups by academic subjects |
| Role Management | Owner, moderator, and member permissions |
| Invite System | Share unique codes to invite members |

### 💬 Real-Time Communication
| Feature | Description |
|---------|-------------|
| Instant Messaging | WebSocket-powered live chat |
| Message Reactions | Express feedback with emoji reactions |
| File Sharing | Share documents, images, and resources |
| Online Status | See who's available in real-time |

### 🤖 AI Study Assistant
| Feature | Description |
|---------|-------------|
| Context-Aware Help | Get answers relevant to your study topic |
| Study Plan Generator | AI-created personalized learning roadmaps |
| Concept Explanations | Detailed breakdowns with examples |
| Quiz Generation | Auto-generated practice questions |
| Session Insights | AI analysis and recommendations |

### 📅 Study Sessions
| Feature | Description |
|---------|-------------|
| Session Scheduling | Plan ahead with calendar integration |
| Agenda Management | Structured session topics and goals |
| Interactive Whiteboard | Collaborative drawing and diagrams |
| Session Notes | Shared note-taking during sessions |
| Recording Support | Review sessions later |

### 📊 Progress Tracking
| Feature | Description |
|---------|-------------|
| Study Time Logging | Track hours spent learning |
| Streak System | Maintain daily study habits |
| Achievements | Unlock badges for milestones |
| Analytics Dashboard | Visualize your progress |

---

## 🛠 Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web application framework |
| **MongoDB** | NoSQL database |
| **Mongoose** | MongoDB ODM |
| **Socket.IO** | Real-time bidirectional communication |
| **JWT** | Authentication tokens |
| **OpenAI API** | AI-powered features |
| **bcryptjs** | Password hashing |
| **Helmet** | Security middleware |
| **Multer** | File upload handling |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI library |
| **TypeScript** | Type-safe JavaScript |
| **Material-UI** | Component library |
| **React Router v6** | Client-side routing |
| **Zustand** | State management |
| **React Query** | Server state & caching |
| **Socket.IO Client** | Real-time communication |
| **Fabric.js** | Canvas & whiteboard |
| **Axios** | HTTP client |
| **React Hook Form** | Form handling |

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** or **yarn** package manager
- **OpenAI API Key** (optional, for AI features) - [Get API Key](https://platform.openai.com/api-keys)

### Installation

#### Option 1: Automated Setup (Windows)

```cmd
# Run the setup script
setup.bat

# Start the application
npm run dev
```

#### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/virtual-study-group.git
   cd virtual-study-group
   ```

2. **Install all dependencies**
   ```bash
   npm run install-deps
   ```

3. **Configure environment variables**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Create environment file
   cp .env.example .env
   ```

4. **Edit the `.env` file**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/study-group
   
   # Authentication
   JWT_SECRET=your-secure-random-string-here
   JWT_EXPIRE=7d
   
   # Client URL (for CORS)
   CLIENT_URL=http://localhost:3000
   
   # AI Features (Optional)
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

5. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

6. **Access the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:5000](http://localhost:5000)

---

## 📁 Project Structure

```
virtual-study-group/
├── 📂 backend/
│   ├── 📂 middleware/       # Express middleware (auth, validation)
│   │   └── auth.js          # JWT authentication middleware
│   ├── 📂 models/           # Mongoose data models
│   │   ├── Group.js         # Study group schema
│   │   ├── Message.js       # Chat message schema
│   │   ├── StudySession.js  # Session schema
│   │   └── User.js          # User schema
│   ├── 📂 routes/           # API route handlers
│   │   ├── ai.js            # AI assistant endpoints
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── chat.js          # Messaging endpoints
│   │   ├── groups.js        # Group management endpoints
│   │   ├── sessions.js      # Study session endpoints
│   │   └── users.js         # User management endpoints
│   ├── server.js            # Express app entry point
│   └── package.json
│
├── 📂 frontend/
│   ├── 📂 public/           # Static assets
│   ├── 📂 src/
│   │   ├── 📂 components/   # Reusable UI components
│   │   │   └── Layout/      # Navigation & layout components
│   │   ├── 📂 contexts/     # React context providers
│   │   │   └── SocketContext.tsx
│   │   ├── 📂 pages/        # Page components
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GroupDetail.tsx
│   │   │   ├── Groups.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── SessionDetail.tsx
│   │   │   └── StudySessions.tsx
│   │   ├── 📂 services/     # API service functions
│   │   ├── 📂 stores/       # Zustand state stores
│   │   ├── 📂 types/        # TypeScript type definitions
│   │   ├── App.tsx          # Main application component
│   │   └── index.tsx        # Application entry point
│   └── package.json
│
├── package.json             # Root package with workspace scripts
├── setup.bat                # Windows setup script
├── start.bat                # Windows start script
└── README.md
```

---

## ⚙ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing |
| `JWT_EXPIRE` | No | `7d` | Token expiration time |
| `CLIENT_URL` | No | `http://localhost:3000` | Frontend URL for CORS |
| `OPENAI_API_KEY` | No | - | OpenAI API key for AI features |

### Database Setup

**Local MongoDB:**
```bash
# Start MongoDB service
mongod --dbpath /path/to/data
```

**MongoDB Atlas:**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Get your connection string
3. Replace `MONGODB_URI` in `.env`

---

## 📖 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Create new user account | No |
| `POST` | `/auth/login` | Authenticate user | No |
| `POST` | `/auth/logout` | End user session | Yes |
| `GET` | `/auth/me` | Get current user profile | Yes |

### Group Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/groups/public` | List public groups | No |
| `GET` | `/groups/my-groups` | Get user's groups | Yes |
| `POST` | `/groups` | Create new group | Yes |
| `GET` | `/groups/:id` | Get group details | Yes |
| `PUT` | `/groups/:id` | Update group | Yes (Owner) |
| `DELETE` | `/groups/:id` | Delete group | Yes (Owner) |
| `POST` | `/groups/:id/join` | Join a group | Yes |
| `POST` | `/groups/:id/leave` | Leave a group | Yes |

### Chat Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/chat/group/:groupId` | Get group messages | Yes |
| `POST` | `/chat/send` | Send new message | Yes |
| `PUT` | `/chat/:messageId` | Edit message | Yes |
| `DELETE` | `/chat/:messageId` | Delete message | Yes |

### AI Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/ai/study-assistant` | Get AI study help | Yes |
| `POST` | `/ai/study-plan` | Generate study plan | Yes |
| `POST` | `/ai/explain` | Explain a concept | Yes |
| `POST` | `/ai/quiz` | Generate practice quiz | Yes |

### Session Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/sessions` | Create study session | Yes |
| `GET` | `/sessions/group/:groupId` | Get group sessions | Yes |
| `GET` | `/sessions/my-sessions` | Get user's sessions | Yes |
| `GET` | `/sessions/:id` | Get session details | Yes |
| `POST` | `/sessions/:id/join` | Join a session | Yes |
| `POST` | `/sessions/:id/start` | Start session | Yes (Host) |
| `POST` | `/sessions/:id/end` | End session | Yes (Host) |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Server ← Client | Client connects |
| `join-group` | Server ← Client | Join group room |
| `leave-group` | Server ← Client | Leave group room |
| `send-message` | Server ← Client | Send chat message |
| `new-message` | Server → Client | Receive new message |
| `user-joined` | Server → Client | User joined notification |
| `user-left` | Server → Client | User left notification |
| `typing` | Bidirectional | Typing indicator |

---

## 💻 Development

### Available Scripts

**Root directory:**
```bash
npm run dev          # Start both servers concurrently
npm run server       # Start backend only
npm run client       # Start frontend only
npm run build        # Build frontend for production
npm run install-deps # Install all dependencies
```

**Backend:**
```bash
cd backend
npm run dev    # Development with nodemon
npm start      # Production start
npm test       # Run tests
```

**Frontend:**
```bash
cd frontend
npm start      # Development server
npm run build  # Production build
npm test       # Run tests
```

### Code Style

This project follows these conventions:
- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **TypeScript** strict mode enabled
- **React** functional components with hooks

### Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run all tests
npm test
```

---

## 🚢 Deployment

### Production Build

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set environment variables:**
   ```env
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-secure-production-secret
   ```

3. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN cd frontend && npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

### Recommended Hosting

| Service | Use Case |
|---------|----------|
| **Heroku** | Quick deployment with MongoDB Atlas |
| **Vercel** | Frontend hosting |
| **Railway** | Full-stack deployment |
| **DigitalOcean** | VPS with full control |
| **AWS** | Enterprise scalability |

---

## 🗺 Roadmap

### Planned Features

- [ ] 🎥 Video/Audio calling integration
- [ ] 📱 Mobile application (React Native)
- [ ] 🎮 Gamification and leaderboards
- [ ] 📚 Integration with external learning platforms
- [ ] 🌐 Offline mode support
- [ ] 📈 Advanced analytics dashboard
- [ ] 🌍 Multi-language support
- [ ] 🔔 Push notifications

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Virtual Study Group

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for AI capabilities
- [Material-UI](https://mui.com/) for the component library
- [Socket.IO](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for the database solution

---

<div align="center">

**[⬆ Back to Top](#-virtual-study-group-platform)**

Made with ❤️ for collaborative learning

</div>
