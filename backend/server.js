const express = require('express');
const http = require('http');
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
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin or from local network
      if (!origin) return callback(null, true);
      const isAllowed = /^http:\/\/(localhost|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+):[0-9]+$/.test(origin);
      callback(null, true); // Allow all in development
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
    
    // Check if origin is in allowed list or matches local network pattern
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^http:\/\/(localhost|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]+\.[0-9]+):[0-9]+$/.test(origin);
    
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
  res.json({ status: 'ok', message: 'Virtual Study Group API is running' });
});

app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Virtual Study Group API',
    endpoints: ['/api/auth', '/api/users', '/api/groups', '/api/chat', '/api/ai', '/api/study-sessions']
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
const sessionParticipants = new Map(); // sessionId -> Set of {userId, socketId, userInfo}
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
  socket.on('join-session', (data) => {
    const { sessionId, userId } = data;
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.userId = userId;

    // Add to session participants
    if (!sessionParticipants.has(sessionId)) {
      sessionParticipants.set(sessionId, new Set());
    }
    
    const participantInfo = {
      userId,
      socketId: socket.id,
      joinedAt: new Date()
    };
    
    // Get existing participants before adding new one
    const existingParticipants = Array.from(sessionParticipants.get(sessionId) || []);
    
    sessionParticipants.get(sessionId).add(participantInfo);
    
    // Send existing participants to the new joiner
    socket.emit('existing-participants', existingParticipants);
    
    // Notify existing participants about new joiner
    socket.to(sessionId).emit('participant-joined', participantInfo);
    
    console.log(`User ${userId} joined session ${sessionId}. Existing participants:`, existingParticipants.length);
  });

  socket.on('leave-session', (sessionId) => {
    if (sessionParticipants.has(sessionId)) {
      const participants = sessionParticipants.get(sessionId);
      // Remove participant
      for (let participant of participants) {
        if (participant.socketId === socket.id) {
          participants.delete(participant);
          socket.to(sessionId).emit('participant-left', participant.userId);
          break;
        }
      }
    }
    socket.leave(sessionId);
    console.log(`User left session ${sessionId}`);
  });

  // WebRTC Signaling for Video Calls
  socket.on('offer', (data) => {
    const { sessionId, offer, to } = data;
    console.log(`Sending offer from ${socket.userId} to ${to}`);
    // Send to specific participant, not broadcast
    io.to(to).emit('offer', {
      offer,
      from: socket.userId
    });
  });

  socket.on('answer', (data) => {
    const { sessionId, answer, to } = data;
    console.log(`Sending answer from ${socket.userId} to ${to}`);
    // Send to specific participant, not broadcast
    io.to(to).emit('answer', {
      answer,
      from: socket.userId
    });
  });

  socket.on('ice-candidate', (data) => {
    const { sessionId, candidate, to } = data;
    // Send to specific participant, not broadcast
    io.to(to).emit('ice-candidate', {
      candidate,
      from: socket.userId
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
      const participants = sessionParticipants.get(socket.sessionId);
      for (let participant of participants) {
        if (participant.socketId === socket.id) {
          participants.delete(participant);
          socket.to(socket.sessionId).emit('participant-left', participant.userId);
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

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces for network access

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Access from local network: http://YOUR_IP:${PORT}`);
});

module.exports = { app, io };

