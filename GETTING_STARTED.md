# 🚀 Virtual Study Group Platform - Quick Start Guide

## What You've Got

A complete AI-powered virtual study group platform with:

### 🎯 **Core Features**
- **User Authentication** - Secure login/registration
- **Study Groups** - Create, join, and manage learning communities  
- **Real-time Chat** - Instant messaging with reactions and file sharing
- **AI Study Assistant** - Get help, explanations, and study plans
- **Study Sessions** - Schedule and host collaborative learning sessions
- **Interactive Whiteboard** - Draw and collaborate in real-time
- **Progress Tracking** - Monitor study time, streaks, and achievements

### 🤖 **AI-Powered Features**
- Study assistance with context awareness
- Automatic study plan generation
- Concept explanations with examples
- Quiz generation for practice
- Session insights and recommendations

### 🛠 **Technology Stack**
- **Backend**: Node.js, Express, MongoDB, Socket.IO, OpenAI API
- **Frontend**: React 18, TypeScript, Material-UI, WebSocket support

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
3. **OpenAI API Key** (optional, for AI features) - [Get one here](https://platform.openai.com/api-keys)

### Quick Setup (Option 1 - Automated)

1. **Run the setup script:**
   ```cmd
   setup.bat
   ```

2. **Configure environment (if needed):**
   - Edit `backend\.env` to add your MongoDB URL and OpenAI API key
   - Default MongoDB: `mongodb://localhost:27017/study-group`

3. **Start the application:**
   ```cmd
   npm run dev
   ```

### Manual Setup (Option 2)

1. **Install dependencies:**
   ```cmd
   npm install
   cd backend && npm install
   cd ..\frontend && npm install
   cd ..
   ```

2. **Configure backend environment:**
   ```cmd
   cd backend
   copy .env.example .env
   ```
   Edit `backend\.env` with your settings:
   ```
   MONGODB_URI=mongodb://localhost:27017/study-group
   JWT_SECRET=your-secret-key
   OPENAI_API_KEY=your-openai-key-optional
   ```

3. **Start development servers:**
   ```cmd
   npm run dev
   ```

## 🌐 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 👤 First Time Usage

1. **Open** http://localhost:3000
2. **Register** a new account or login
3. **Create** your first study group
4. **Invite** friends or join public groups
5. **Start** your first study session!

## 🔧 Configuration Options

### Database Setup
- **Local MongoDB**: Make sure MongoDB service is running
- **MongoDB Atlas**: Replace `MONGODB_URI` in `backend\.env` with your Atlas connection string

### AI Features
- Add your OpenAI API key to `backend\.env` as `OPENAI_API_KEY`
- Without API key, all other features work except AI assistance

### File Uploads
- Files are stored in `backend\uploads\` directory
- Maximum file size: 10MB (configurable in `.env`)

## 📁 Project Structure

```
virtual-study-group/
├── backend/
│   ├── models/          # Database schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & validation
│   └── server.js        # Main server
├── frontend/
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # App pages
│   │   ├── stores/      # State management
│   │   └── services/    # API calls
└── package.json         # Scripts & dependencies
```

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```cmd
# Kill processes on ports 3000/5000
npx kill-port 3000 5000
```

**MongoDB connection failed:**
- Ensure MongoDB is running: `net start MongoDB` (Windows)
- Check connection string in `backend\.env`

**Dependencies issues:**
```cmd
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```cmd
# Clear caches
npm run clean
npm run install-deps
```

## 🎮 Key Features Demo

### 1. Create a Study Group
- Go to Groups → Create New Group
- Set subject, privacy level, and description
- Invite members with group code

### 2. Start a Study Session  
- Navigate to Sessions → New Session
- Set title, time, and agenda
- Invite group members

### 3. Use AI Assistant
- Ask questions in group chat
- Request study plans: `/plan [subject] [duration]`
- Get explanations: `/explain [concept]`

### 4. Collaborate in Real-time
- Use whiteboard during sessions
- Share screen and files
- Take collaborative notes

## 🛡 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection

## 🔮 What's Next?

This platform is designed to be:
- **Scalable**: Add more AI models, integrations
- **Extensible**: Plugin architecture for new features  
- **Mobile-ready**: PWA capabilities built-in
- **Enterprise-ready**: Role management, analytics

## 💡 Usage Tips

- **Groups**: Start with small, focused groups (5-10 members)
- **Sessions**: Use agenda items to stay organized
- **AI**: Be specific in your questions for better responses
- **Notes**: Collaborate on session notes for better retention

## 📞 Support

Check the console for detailed error messages:
- **Frontend**: Browser Developer Tools (F12)
- **Backend**: Terminal running the server

---

**Happy Learning! 🎓✨**

Your virtual study group platform is ready to revolutionize collaborative learning!
