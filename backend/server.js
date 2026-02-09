const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const sessionRoutes = require('./routes/sessions');

const app = express();

// Create HTTPS server as primary
const certPath = path.join(__dirname, 'certs', 'cert.pem');
const keyPath = path.join(__dirname, 'certs', 'key.pem');

let server;
let io;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(httpsOptions, app);
  console.log('🔐 HTTPS Server initialized (primary)');
} else {
  server = http.createServer(app);
  console.log('⚠️  HTTP Server initialized (HTTPS not configured)');
}

io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins in development
      callback(null, true);
    },
    methods: ["GET", "POST"]
  }
});

// Parse allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
  if (process.env.CLIENT_URLS) {
    return process.env.CLIENT_URLS.split(',').map(url => url.trim());
  }
  return ['http://localhost:3000', 'http://localhost:3001'];
};

const allowedOrigins = getAllowedOrigins();

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list or matches local network pattern (HTTP and HTTPS)
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]+\.[0-9]+):[0-9]+$/.test(origin);
    
    if (isAllowed) {
      console.log('Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('CORS would block origin (but allowing in dev):', origin);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: false, // Set to false for network access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Rate limiting (disabled for development)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
// });
// app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/study-group', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Make io accessible to routes
app.set('io', io);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Virtual Study Group API is running',
    timestamp: new Date().toISOString(),
    clientIp: req.ip || req.connection.remoteAddress
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Virtual Study Group API',
    endpoints: ['/api/auth', '/api/users', '/api/groups', '/api/chat', '/api/ai', '/api/study-sessions'],
    clientIp: req.ip || req.connection.remoteAddress
  });
});

// Network test endpoint
app.get('/api/test-network', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Network connection successful',
    serverTime: new Date().toISOString(),
    clientIp: req.ip || req.connection.remoteAddress,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study-sessions', sessionRoutes);

// Socket.IO connection handling
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const sessionParticipants = new Map(); // sessionId -> Map<userId, {userId, socketId, userInfo}>
const liveGroups = new Map(); // groupId -> Set of active users
const userStatus = new Map(); // userId -> { isStudying, currentGroup, lastActivity }

// Broadcast user count updates
const broadcastUserCount = () => {
  const totalUsers = connectedUsers.size;
  io.emit('user-count-update', totalUsers);
};

// Broadcast live groups updates
const broadcastLiveGroups = () => {
  const liveGroupsArray = Array.from(liveGroups.entries()).map(([groupId, users]) => ({
    id: groupId,
    activeMembers: users.size
  }));
  io.emit('live-groups-update', liveGroupsArray);
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-user', (userId) => {
    // Clean up any previous connections for this user
    if (connectedUsers.has(userId)) {
      const oldSocketId = connectedUsers.get(userId);
      userSockets.delete(oldSocketId);
    }
    
    connectedUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    socket.userId = userId;
    
    // Join the user's personal room for direct messages
    socket.join(`user-${userId}`);
    
    // Initialize user status
    userStatus.set(userId, {
      isStudying: false,
      currentGroup: null,
      lastActivity: new Date()
    });
    
    // Broadcast updated user count
    broadcastUserCount();
    
    // Send welcome notification
    socket.emit('notification', {
      type: 'welcome',
      message: 'Welcome to Virtual Study Group!',
      timestamp: new Date()
    });
    
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  // Group activity tracking
  socket.on('join-group', (data) => {
    const { groupId, userId } = data;
    console.log(`Socket ${socket.id} joining group room: group-${groupId} for user ${userId}`);
    socket.join(`group-${groupId}`);
    
    if (!liveGroups.has(groupId)) {
      liveGroups.set(groupId, new Set());
    }
    liveGroups.get(groupId).add(userId);
    
    // Update user status
    if (userStatus.has(userId)) {
      userStatus.set(userId, {
        ...userStatus.get(userId),
        currentGroup: groupId,
        lastActivity: new Date()
      });
    }
    
    // Notify group members
    socket.to(`group-${groupId}`).emit('user-joined-group', {
      userId,
      timestamp: new Date()
    });
    
    broadcastLiveGroups();
    console.log(`User ${userId} joined group ${groupId}`);
  });

  socket.on('leave-group', (data) => {
    const { groupId, userId } = data;
    socket.leave(`group-${groupId}`);
    
    if (liveGroups.has(groupId)) {
      liveGroups.get(groupId).delete(userId);
      if (liveGroups.get(groupId).size === 0) {
        liveGroups.delete(groupId);
      }
    }
    
    // Update user status
    if (userStatus.has(userId)) {
      userStatus.set(userId, {
        ...userStatus.get(userId),
        currentGroup: null,
        lastActivity: new Date()
      });
    }
    
    // Notify group members
    socket.to(`group-${groupId}`).emit('user-left-group', {
      userId,
      timestamp: new Date()
    });
    
    broadcastLiveGroups();
    console.log(`User ${userId} left group ${groupId}`);
  });

  // Study session status tracking
  socket.on('start-studying', (data) => {
    const { userId, sessionId, groupId } = data;
    
    if (userStatus.has(userId)) {
      userStatus.set(userId, {
        ...userStatus.get(userId),
        isStudying: true,
        currentSession: sessionId,
        lastActivity: new Date()
      });
    }
    
    // Notify friends/group members
    if (groupId) {
      socket.to(`group-${groupId}`).emit('user-started-studying', {
        userId,
        sessionId,
        timestamp: new Date()
      });
    }
    
    console.log(`User ${userId} started studying`);
  });

  socket.on('stop-studying', (data) => {
    const { userId, duration } = data;
    
    if (userStatus.has(userId)) {
      userStatus.set(userId, {
        ...userStatus.get(userId),
        isStudying: false,
        currentSession: null,
        lastActivity: new Date()
      });
    }
    
    // Send achievement notification if milestone reached
    if (duration && duration > 0) {
      socket.emit('notification', {
        type: 'achievement',
        message: `Great job! You studied for ${duration} minutes today!`,
        timestamp: new Date()
      });
    }
    
    console.log(`User ${userId} stopped studying after ${duration} minutes`);
  });
  socket.on('join-session', async (data) => {
    const { sessionId, userId } = data;
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.userId = userId;

    try {
      // Fetch user information from database
      const User = require('./models/User');
      const user = await User.findById(userId).select('firstName lastName avatar username');
      
      // Initialize session participants map if needed
      if (!sessionParticipants.has(sessionId)) {
        sessionParticipants.set(sessionId, new Map());
      }
      
      const participantsMap = sessionParticipants.get(sessionId);
      
      // Check if user already exists (reconnection scenario)
      const existingParticipant = participantsMap.get(userId);
      if (existingParticipant) {
        // Update socketId for reconnection
        existingParticipant.socketId = socket.id;
        console.log(`User ${userId} reconnected to session ${sessionId}`);
      }
      
      const participantInfo = {
        userId,
        socketId: socket.id,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        avatar: user?.avatar || '',
        username: user?.username || '',
        joinedAt: existingParticipant?.joinedAt || new Date()
      };
      
      // Store participant (will update if exists, add if new)
      participantsMap.set(userId, participantInfo);
      
      // Get existing participants (excluding current user)
      const existingParticipants = Array.from(participantsMap.values())
        .filter(p => p.userId !== userId)
        .map(p => ({
          userId: p.userId,
          socketId: p.socketId,
          name: p.name || 'Unknown',
          avatar: p.avatar || '',
          username: p.username || '',
          joinedAt: p.joinedAt
        }));
      
      // Send existing participants to the new joiner
      socket.emit('existing-participants', existingParticipants);
      
      // Notify existing participants about new joiner (only if it's a new join, not reconnection)
      if (!existingParticipant) {
        socket.to(sessionId).emit('participant-joined', {
          userId: participantInfo.userId,
          socketId: participantInfo.socketId,
          name: participantInfo.name,
          avatar: participantInfo.avatar,
          username: participantInfo.username,
          joinedAt: participantInfo.joinedAt
        });
      }
      
      console.log(`User ${userId} (${participantInfo.name}) joined session ${sessionId}. Total participants: ${participantsMap.size}`);
    } catch (error) {
      console.error('Error in join-session:', error);
      // Still allow join but with minimal info
      const participantInfo = {
        userId,
        socketId: socket.id,
        name: 'Unknown',
        avatar: '',
        username: '',
        joinedAt: new Date()
      };
      
      if (!sessionParticipants.has(sessionId)) {
        sessionParticipants.set(sessionId, new Map());
      }
      sessionParticipants.get(sessionId).set(userId, participantInfo);
    }
  });

  socket.on('leave-session', (sessionId) => {
    if (sessionParticipants.has(sessionId)) {
      const participantsMap = sessionParticipants.get(sessionId);
      // Find and remove participant by socketId
      for (let [userId, participant] of participantsMap.entries()) {
        if (participant.socketId === socket.id) {
          participantsMap.delete(userId);
          socket.to(sessionId).emit('participant-left', participant.userId);
          console.log(`User ${userId} (${participant.name}) left session ${sessionId}. Remaining: ${participantsMap.size}`);
          break;
        }
      }
      
      // Clean up empty sessions
      if (participantsMap.size === 0) {
        sessionParticipants.delete(sessionId);
      }
    }
    socket.leave(sessionId);
  });

  // Socket.IO Video Frame Streaming (replaces WebRTC)
  let videoFrameCount = 0;
  socket.on('video-frame', (data, callback) => {
    const { sessionId, frameData, userId } = data;
    videoFrameCount++;
    if (videoFrameCount <= 3 || videoFrameCount % 300 === 0) {
      console.log(`📹 Video frame #${videoFrameCount} from user ${userId} in session ${sessionId} (${frameData?.length || 0} bytes)`);
    }
    
    // Broadcast video frame to all other participants in the session
    socket.to(sessionId).emit('video-frame', {
      from: socket.id,
      frameData,
      userId: userId || socket.userId
    });
    
    // Acknowledge the frame was sent
    if (callback && typeof callback === 'function') {
      callback();
    }
  });

  socket.on('audio-chunk', (data) => {
    const { sessionId, audioData, userId } = data;
    // Broadcast audio chunk to all other participants in the session
    socket.to(sessionId).emit('audio-chunk', {
      from: socket.id,
      audioData,
      userId
    });
  });

  // Session Chat
  socket.on('session-message', (data) => {
    const { sessionId, message } = data;
    socket.to(sessionId).emit('session-message', message);
  });

  // Participant status updates (mic/video on/off)
  socket.on('participant-status-change', (data) => {
    const { sessionId, userId, micEnabled, videoEnabled } = data;
    socket.to(sessionId).emit('participant-status-change', {
      userId,
      micEnabled,
      videoEnabled
    });
  });

  // Group functionality (existing)
  socket.on('join-group', (groupId) => {
    socket.join(groupId);
    socket.to(groupId).emit('user-joined', { userId: socket.userId });
  });

  socket.on('leave-group', (groupId) => {
    socket.leave(groupId);
    socket.to(groupId).emit('user-left', { userId: socket.userId });
  });

  socket.on('send-message', (data) => {
    io.to(data.groupId).emit('new-message', data);
  });

  socket.on('whiteboard-draw', (data) => {
    socket.to(data.groupId).emit('whiteboard-update', data);
  });

  socket.on('screen-share', (data) => {
    socket.to(data.groupId).emit('screen-share-update', data);
  });

  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    
    if (userId) {
      // Clean up user connections
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);
      userStatus.delete(userId);
      
      // Remove from all groups
      for (let [groupId, users] of liveGroups) {
        if (users.has(userId)) {
          users.delete(userId);
          socket.to(`group-${groupId}`).emit('user-left-group', {
            userId,
            timestamp: new Date()
          });
        }
        // Clean up empty groups
        if (users.size === 0) {
          liveGroups.delete(groupId);
        }
      }
    }
    
    // Remove from session participants
    if (socket.sessionId && sessionParticipants.has(socket.sessionId)) {
      const participantsMap = sessionParticipants.get(socket.sessionId);
      // Find and remove participant by socketId
      for (let [userId, participant] of participantsMap.entries()) {
        if (participant.socketId === socket.id) {
          participantsMap.delete(userId);
          socket.to(socket.sessionId).emit('participant-left', participant.userId);
          console.log(`User ${userId} disconnected from session ${socket.sessionId}. Remaining: ${participantsMap.size}`);
          
          // Clean up empty sessions
          if (participantsMap.size === 0) {
            sessionParticipants.delete(socket.sessionId);
          }
          break;
        }
      }
    }
    
    // Broadcast updated counts
    broadcastUserCount();
    broadcastLiveGroups();
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: ['/api/auth', '/api/users', '/api/groups', '/api/chat', '/api/ai', '/api/study-sessions']
  });
});

const PORT = 5443;
const HTTP_PORT = 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Start HTTPS server (primary)
server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on https://${HOST}:${PORT}`);
  console.log(`   Local access: https://localhost:${PORT}`);
  console.log(`   Network access: https://YOUR_IP:${PORT}`);
});

// Optional: Create HTTP redirect server on port 5000 (for convenience)
const redirectApp = express();
redirectApp.all('*', (req, res) => {
  res.redirect(`https://${req.hostname}:${PORT}${req.url}`);
});

const httpServer = http.createServer(redirectApp);
httpServer.listen(HTTP_PORT, HOST, () => {
  console.log(`🔄 HTTP redirect server on http://${HOST}:${HTTP_PORT}`);
  console.log(`   Redirects to https://${HOST}:${PORT}`);
});

module.exports = { app, io };

