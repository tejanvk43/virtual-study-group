import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  TextField,
  Drawer,
  Badge,
  InputAdornment,
  Tooltip,
  Fab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat,
  ScreenShare,
  People,
  Settings,
  Send,
  Close,
  StopScreenShare,
  FullscreenExit,
  Fullscreen,
  PushPin,
  VolumeUp,
  VolumeOff,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const theme = useTheme();
  
  // UI States
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [remoteMediaRecorders, setRemoteMediaRecorders] = useState<Map<string, MediaRecorder>>(new Map());
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const remoteCanvasContextRefs = useRef<Map<string, CanvasRenderingContext2D>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const participantsRef = useRef<any[]>([]); // Ref to access latest participants in socket handlers
  const mediaPermissionCheckRef = useRef<boolean>(false); // Track if we've already checked permissions
  const socketRef = useRef<typeof socket>(socket); // Ref to avoid stale socket closure in streaming
  const sessionIdRef = useRef<string | undefined>(id);
  const userIdRef = useRef<string | undefined>(user?._id);
  
  // Audio processing refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const remoteAudioContextRefs = useRef<Map<string, AudioContext>>(new Map());
  const remoteAudioProcessorRefs = useRef<Map<string, ScriptProcessorNode>>(new Map());

  // Keep refs in sync with latest values
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { sessionIdRef.current = id; }, [id]);
  useEffect(() => { userIdRef.current = user?._id; }, [user?._id]);

  // Ensure local video element always uses local stream (never remote)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const correctStream = isScreenSharing && screenStream ? screenStream : localStream;
      if (localVideoRef.current.srcObject !== correctStream) {
        localVideoRef.current.srcObject = correctStream;
        console.log('✅ Local video element ensured to use local stream');
      }
    }
  }, [localStream, screenStream, isScreenSharing]);

  // Ensure remote video elements are connected to their canvas streams
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      const videoElement = remoteVideoRefs.current.get(socketId);
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
        const participant = participants.find(p => p.socketId === socketId);
        console.log('🔄 Updated remote video element stream for:', socketId, participant?.name);
      }
    });
  }, [remoteStreams, participants]);

  useEffect(() => {
    console.log('📋 [useEffect] SessionDetail component mounted/updated');
    console.log('   - sessionId:', id);
    console.log('   - userId:', user?._id);
    console.log('   - isLoading:', loading);
    
    console.log('📋 [useEffect] Fetching session details...');
    fetchSessionDetails();
    
    console.log('📋 [useEffect] Initializing media...');
    initializeMedia(); // Initialize camera when user intentionally joins a session
    
    console.log('📋 [useEffect] Setting up socket listeners...');
    setupSocketListeners();
    
    return () => {
      console.log('🧹 [useEffect cleanup] Component unmounting, cleaning up resources...');
      
      // Cleanup media streams when component unmounts
      if (localStreamRef.current) {
        console.log('🧹 [useEffect cleanup] Stopping local stream tracks...');
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        console.log('🧹 [useEffect cleanup] Stopping screen stream tracks...');
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('🧹 [useEffect cleanup] Stopping media recorder...');
        mediaRecorderRef.current.stop();
      }
      
      // Stop animation frame
      if (animationFrameRef.current) {
        console.log('🧹 [useEffect cleanup] Canceling animation frame...');
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Remove all socket listeners
      if (socket) {
        console.log('🧹 [useEffect cleanup] Removing socket listeners...');
        socket.off('existing-participants');
        socket.off('participant-joined');
        socket.off('participant-left');
        socket.off('video-frame');
        socket.off('audio-chunk');
        socket.off('session-message');
        socket.off('session-force-end');
        socket.off('participant-status-change');
        
        // Leave the session room
        if (id) {
          console.log('🧹 [useEffect cleanup] Leaving session room:', id);
          socket.emit('leave-session', id);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners for real-time video calling using Socket.IO streaming
  const setupSocketListeners = () => {
    if (!socket || !id) {
      console.error('❌ [setupSocketListeners] Cannot setup - socket:', !!socket, 'id:', !!id);
      return;
    }

    console.log('🔌 [setupSocketListeners] Setting up socket listeners...');
    console.log('   - Socket ID:', socket.id);
    console.log('   - Socket connected:', socket.connected);
    console.log('   - Session ID:', id);

    // Join the session room
    console.log('🔌 [setupSocketListeners] Emitting join-session event...');
    socket.emit('join-session', { sessionId: id, userId: user?._id });

    // Handle existing participants (when you join)
    socket.on('existing-participants', async (existingParticipants: any[]) => {
      console.log('📥 [setupSocketListeners] Existing participants received:', existingParticipants);
      for (const participant of existingParticipants) {
        if (participant.userId !== user?._id) {
          setParticipants(prev => {
            const updated = [...prev, participant];
            participantsRef.current = updated; // Update ref
            return updated;
          });
          // Create video element for remote participant
          createRemoteVideoElement(participant.socketId, participant);
        }
      }
    });

    // Handle new participant joining (when someone else joins)
    socket.on('participant-joined', async (participant: any) => {
      console.log('👤 New participant joined:', participant);
      setParticipants(prev => {
        const updated = [...prev, participant];
        participantsRef.current = updated; // Update ref
        return updated;
      });
      createRemoteVideoElement(participant.socketId, participant);
    });

    // Handle participant leaving
    socket.on('participant-left', (participantId: string) => {
      console.log('👋 Participant left:', participantId);
      setParticipants(prev => {
        const updated = prev.filter(p => p.userId !== participantId);
        participantsRef.current = updated; // Update ref
        // Also find by socketId if needed
        const participant = prev.find(p => p.userId === participantId);
        if (participant && participant.socketId) {
          const socketId = participant.socketId;
          // Clean up all references
          remoteCanvasRefs.current.delete(socketId);
          remoteCanvasContextRefs.current.delete(socketId);
          const videoElement = remoteVideoRefs.current.get(socketId);
          if (videoElement) {
            videoElement.srcObject = null;
            remoteVideoRefs.current.delete(socketId);
          }
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(socketId);
            return newMap;
          });
        }
        return updated;
      });
    });

    // Handle incoming video frames via Socket.IO
    let receivedFrameCount = 0;
    socket.on('video-frame', ({ from, frameData, userId }: { from: string; frameData: string; userId?: string }) => {
      receivedFrameCount++;
      if (receivedFrameCount <= 3 || receivedFrameCount % 150 === 0) {
        console.log(`📹 Received video frame #${receivedFrameCount}:`, { from, userId, size: frameData?.length });
      }
      
      // IMPORTANT: Ignore frames from self (shouldn't happen, but safety check)
      if (userId === user?._id) {
        console.warn('⚠️ Received video frame from self, ignoring');
        return;
      }
      
      // Use ref to get latest participants (avoid stale closure)
      const currentParticipants = participantsRef.current;
      console.log('📋 Current participants:', currentParticipants.map(p => ({ userId: p.userId, socketId: p.socketId, name: p.name })));
      
      // Try to find participant by socketId first, then by userId
      let participantSocketId = from;
      
      // First try to match by socketId (most reliable)
      let participant = currentParticipants.find(p => p.socketId === from);
      
      // If not found, try by userId
      if (!participant && userId) {
        participant = currentParticipants.find(p => p.userId === userId);
        if (participant && participant.socketId) {
          participantSocketId = participant.socketId;
        }
      } else if (participant && participant.socketId) {
        participantSocketId = participant.socketId;
      }
      
      // If participant not found but we have userId, create a temporary participant entry
      if (!participant && userId && userId !== user?._id) {
        console.log('📹 Video frame from unknown participant, creating temporary entry:', { userId, socketId: from });
        const tempParticipant = {
          userId,
          socketId: from,
          name: 'Unknown',
          avatar: '',
          username: '',
          videoEnabled: true,
          micEnabled: true
        };
        setParticipants(prev => {
          // Check if already exists
          if (!prev.find(p => p.userId === userId || p.socketId === from)) {
            const updated = [...prev, tempParticipant];
            participantsRef.current = updated;
            return updated;
          }
          return prev;
        });
        // Create canvas for this participant
        createRemoteVideoElement(from, tempParticipant);
        participant = tempParticipant;
        participantSocketId = from;
      }
      
      const canvas = remoteCanvasRefs.current.get(participantSocketId);
      const ctx = remoteCanvasContextRefs.current.get(participantSocketId);
      
      if (canvas && ctx) {
        try {
          // Use simple Image approach for reliability
          const img = new Image();
          img.onload = () => {
            try {
              // Draw the image onto the canvas
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Log every 60 frames to avoid spam
              if (Math.random() < 0.0167) { // ~1 in 60
                console.log('✅ Video frame rendered for participant:', participantSocketId, participant?.name);
              }
            } catch (drawErr) {
              console.error('❌ Error drawing image to canvas:', drawErr);
            }
          };
          img.onerror = (error) => {
            console.error('❌ Error loading video frame image:', error, 'for participant:', participantSocketId);
          };
          img.onabort = () => {
            console.warn('⚠️ Image load aborted for participant:', participantSocketId);
          };
          
          // Set the image source - this should trigger the load
          img.src = `data:image/jpeg;base64,${frameData}`;
        } catch (error) {
          console.error('❌ Error setting up image load:', error);
        }
      } else {
        console.warn('⚠️ Video frame received but canvas not found! Creating canvas...', {
          participantSocketId,
          from,
          userId,
          participantName: participant?.name,
          canvasExists: !!remoteCanvasRefs.current.has(participantSocketId),
          ctxExists: !!remoteCanvasContextRefs.current.has(participantSocketId)
        });
        
        // Try to create canvas if we have participant info
        if (participant) {
          createRemoteVideoElement(participantSocketId, participant);
        } else if (userId && userId !== user?._id) {
          // Create with minimal info
          const tempParticipant = {
            userId,
            socketId: from,
            name: 'Unknown',
            avatar: '',
            username: '',
            videoEnabled: true,
            micEnabled: true
          };
          createRemoteVideoElement(from, tempParticipant);
        }
      }
    });

    // Handle incoming audio chunks from remote participants
    socket.on('audio-chunk', ({ from, audioData }: { from: string; audioData: ArrayBuffer }) => {
      try {
        // Create or get audio context for this participant
        let remoteAudioCtx = remoteAudioContextRefs.current.get(from);
        if (!remoteAudioCtx) {
          remoteAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          remoteAudioContextRefs.current.set(from, remoteAudioCtx);
        }

        // Decode and play audio
        remoteAudioCtx.decodeAudioData(audioData, (buffer) => {
          const source = remoteAudioCtx!.createBufferSource();
          source.buffer = buffer;
          source.connect(remoteAudioCtx!.destination);
          source.start(0);
        }, (err) => {
          console.error('❌ Audio decode error:', err);
        });
      } catch (err) {
        console.error('❌ Audio chunk error:', err);
      }
    });

    // Chat messages
    socket.on('session-message', (message: any) => {
      setMessages(prev => [...prev, message]);
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Handle participant status changes
    socket.on('participant-status-change', ({ userId, micEnabled, videoEnabled }: any) => {
      setParticipants(prev => {
        const updated = prev.map(p => 
          p.userId === userId 
            ? { ...p, micEnabled, videoEnabled }
            : p
        );
        participantsRef.current = updated; // Update ref
        return updated;
      });
    });

    // Handle force end from host
    socket.on('session-force-end', (data: any) => {
      toast.error(data.message || 'The session has ended');
      // Stop all media streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      // Navigate away after a short delay
      setTimeout(() => {
        navigate('/sessions');
      }, 2000);
    });
  };

  // Create video element for remote participant
  const createRemoteVideoElement = (socketId: string, participant: any) => {
    // Check if already exists
    if (remoteCanvasRefs.current.has(socketId)) {
      console.log('Remote video element already exists for:', socketId);
      return;
    }
    
    // Create a persistent canvas for this participant - match the sender's resolution (320x240)
    const canvas = document.createElement('canvas');
    canvas.width = 320;  // Match sender's resolution for no upscaling artifacts
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Failed to get canvas context for remote participant');
      return;
    }
    
    // Draw placeholder
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(participant.name || 'Participant', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '12px Arial';
    ctx.fillText('Waiting for video...', canvas.width / 2, canvas.height / 2 + 20);
    
    // Create video stream from canvas (30 FPS for smooth video)
    const stream = canvas.captureStream(30);
    
    // Store references (video element will be created in render)
    remoteCanvasRefs.current.set(socketId, canvas);
    remoteCanvasContextRefs.current.set(socketId, ctx);
    
    // Create a MediaStream for the remote participant (for state tracking and rendering)
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(socketId, stream);
      console.log('✅ Created remote video stream for participant:', participant.name, 'socketId:', socketId, 'canvas size: 320x240');
      return newMap;
    });
    
    // Force update any existing video element to use the new stream
    setTimeout(() => {
      const videoElement = remoteVideoRefs.current.get(socketId);
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
        console.log('🔄 Updated existing video element with canvas stream for:', socketId);
      }
    }, 100);
    
    console.log('✅ Created remote video canvas for participant:', participant.name, 'socketId:', socketId);
  };

  // Start sending video frames via Socket.IO
  const startVideoStreaming = (retryCount = 0) => {
    const currentStream = localStreamRef.current;
    const currentSocket = socketRef.current;
    const currentSessionId = sessionIdRef.current;
    const currentUserId = userIdRef.current;
    
    console.log('🔍 [startVideoStreaming] Checking preconditions (attempt', retryCount + 1, ')...');
    console.log('   - hasLocalStream:', !!currentStream, '- hasSocket:', !!currentSocket, '- connected:', currentSocket?.connected, '- sessionId:', !!currentSessionId);
    
    const MAX_RETRIES = 10;
    const retryDelay = Math.min(500 * (retryCount + 1), 3000);
    
    if (!currentStream) {
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ [startVideoStreaming] No local stream yet, retrying in ${retryDelay}ms...`);
        setTimeout(() => startVideoStreaming(retryCount + 1), retryDelay);
      } else {
        console.error('❌ [startVideoStreaming] No local stream after max retries');
      }
      return;
    }
    if (!currentSocket) {
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ [startVideoStreaming] Socket not initialized, retrying in ${retryDelay}ms...`);
        setTimeout(() => startVideoStreaming(retryCount + 1), retryDelay);
      } else {
        console.error('❌ [startVideoStreaming] Socket not initialized after max retries');
      }
      return;
    }
    if (!currentSocket.connected) {
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ [startVideoStreaming] Socket not connected, retrying in ${retryDelay}ms...`);
        setTimeout(() => startVideoStreaming(retryCount + 1), retryDelay);
      } else {
        console.error('❌ [startVideoStreaming] Socket not connected after max retries');
      }
      return;
    }
    if (!currentSessionId) {
      console.error('❌ [startVideoStreaming] No session ID');
      return;
    }

    console.log('✅ [startVideoStreaming] All preconditions met, initializing streaming...');

    // Stop any existing streaming
    if (animationFrameRef.current) {
      console.log('🔄 [startVideoStreaming] Canceling previous animation frame');
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Create canvas for capturing frames
    const canvas = document.createElement('canvas');
    canvas.width = 320; // Reduce resolution for better performance
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ [startVideoStreaming] Failed to get canvas context');
      return;
    }
    console.log('✅ [startVideoStreaming] Canvas created (320x240)');

    const video = document.createElement('video');
    video.srcObject = currentStream;
    video.muted = true;
    video.playsInline = true;
    
    console.log('✅ [startVideoStreaming] Video element created and srcObject set');
    
    // Try to play the video
    const playPromise = video.play().catch(err => {
      console.error('❌ [startVideoStreaming] Error playing video for frame capture:', err);
    });

    let lastFrameTime = 0;
    let frameCount = 0;
    let activeFrameCount = 0;
    const targetFPS = 15; // 15 FPS for good balance of smoothness and performance
    const frameInterval = 1000 / targetFPS;
    let pendingFrames = 0;
    const MAX_PENDING_FRAMES = 3; // Prevent frame backlog
    let hasLoggedStart = false;

    const sendFrame = (currentTime: number = 0) => {
      try {
        // Use refs for latest socket/session state to avoid stale closures
        const liveSocket = socketRef.current;
        const liveSessionId = sessionIdRef.current;
        const liveUserId = userIdRef.current;
        
        // Check if video is ready (state >= HAVE_CURRENT_DATA means at least one frame available)
        const isVideoReady = video.readyState >= video.HAVE_CURRENT_DATA;
        const isSocketConnected = liveSocket && liveSocket.connected;
        
        if (!hasLoggedStart && isVideoReady && isSocketConnected) {
          console.log('🎬 [sendFrame] Video streaming active (readyState:', video.readyState, ')');
          hasLoggedStart = true;
        }
        
        if (isVideoReady && isSocketConnected && liveSessionId) {
          // Throttle frame rate
          const now = currentTime || performance.now();
          if (now - lastFrameTime >= frameInterval && pendingFrames < MAX_PENDING_FRAMES) {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
              
              if (frameData) {
                pendingFrames++;
                activeFrameCount++;
                
                liveSocket.emit('video-frame', {
                  sessionId: liveSessionId,
                  frameData,
                  userId: liveUserId
                }, () => {
                  pendingFrames--;
                });
                
                frameCount++;
                if (frameCount % 150 === 0) {
                  console.log(`📤 [sendFrame] Sent ${frameCount} frames (pending: ${pendingFrames})`);
                }
                
                lastFrameTime = now;
              }
            } catch (encodeErr) {
              if (frameCount % 100 === 0) {
                console.error('❌ [sendFrame] Encoding error:', encodeErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('❌ [sendFrame] Error:', err);
      }
      animationFrameRef.current = requestAnimationFrame(sendFrame);
    };

    const startStreaming = () => {
      console.log('✅ [startStreaming] Local video ready, starting frame streaming (24 FPS, 320x240, 50% quality)');
      animationFrameRef.current = requestAnimationFrame(sendFrame);
    };

    // If play promise exists, wait for it, otherwise start immediately
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(startStreaming).catch(err => {
        console.error('❌ [startVideoStreaming] Video play failed:', err);
        // Still try to start streaming anyway
        startStreaming();
      });
    } else {
      // If there's no play promise, check alternative ways to detect when video is ready
      if (video.readyState >= video.HAVE_METADATA) {
        console.log('✅ [startVideoStreaming] Video ready state already met, starting immediately');
        startStreaming();
      } else {
        console.log('⏳ [startVideoStreaming] Waiting for video to be ready...');
        video.addEventListener('playing', startStreaming, { once: true });
        video.addEventListener('loadedmetadata', startStreaming, { once: true });
      }
    }

    video.addEventListener('error', (err) => {
      console.error('❌ [startVideoStreaming] Video element error:', err);
    });
    
    console.log('✅ [startVideoStreaming] Initialization complete, waiting for video ready...');
    
    // Start audio processing if available
    if (currentStream && currentStream.getAudioTracks().length > 0) {
      startAudioProcessing(currentStream);
    }
  };

  // Start audio processing and sending audio chunks
  const startAudioProcessing = (stream: MediaStream) => {
    try {
      console.log('🎙️ [startAudioProcessing] Starting audio processing...');
      
      // Create audio context
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      
      // Create a script processor to capture audio samples
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        
        // Convert to WAV format (simplified)
        const wav = encodeWAV(audioData, audioCtx.sampleRate);
        
        // Send audio chunk via socket
        const socket = socketRef.current;
        const sessionId = sessionIdRef.current;
        if (socket && socket.connected && sessionId) {
          socket.emit('audio-chunk', {
            sessionId,
            audioData: wav,
            userId: userIdRef.current
          });
        }
      };
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
      
      console.log('✅ [startAudioProcessing] Audio processing started');
    } catch (err) {
      console.error('❌ [startAudioProcessing] Error:', err);
    }
  };

  // Simple WAV encoding for audio chunks
  const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    // PCM data
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(index, samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7FFF, true);
      index += 2;
    }
    
    return buffer;
  };

  // Stop video streaming
  const stopVideoStreaming = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop audio processing
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clean up remote audio contexts
    remoteAudioContextRefs.current.forEach(ctx => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    });
    remoteAudioContextRefs.current.clear();
    remoteAudioProcessorRefs.current.clear();
  };

  const initializeMedia = async () => {
    // Prevent multiple simultaneous initialization attempts
    if (mediaPermissionCheckRef.current) {
      console.log('🔄 [initializeMedia] Already initializing media, skipping...');
      return;
    }
    mediaPermissionCheckRef.current = true;
    
    try {
      console.log('🎥 [initializeMedia] Starting media initialization...');
      console.log('   - Navigator available:', !!navigator.mediaDevices);
      console.log('   - getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      // Create a timeout that rejects after 15 seconds
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error('⏱️ [initializeMedia] getUserMedia timeout - no response for 15 seconds');
          reject(new Error('getUserMedia timeout - took too long'));
        }, 15000);
      });
      
      const mediaPromise = navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('🎥 [initializeMedia] getUserMedia call initiated, waiting for response...');
      
      const stream = await Promise.race([mediaPromise, timeoutPromise]) as MediaStream;
      clearTimeout(timeoutId!);
      
      console.log('✅ [initializeMedia] Successfully got user media stream');
      console.log('   - Video tracks:', stream.getVideoTracks().length);
      console.log('   - Audio tracks:', stream.getAudioTracks().length);
      console.log('   - Stream active:', stream.active);
      
      if (stream.getVideoTracks().length === 0) {
        throw new Error('No video tracks in stream');
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log('✅ [initializeMedia] State and ref updated with stream');
      
      // Note: localVideoRef.current may be null here because the <video> element is
      // conditionally rendered based on localStream state. The useEffect will handle
      // assigning srcObject once the element mounts after re-render.
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ [initializeMedia] Set local video element srcObject directly');
      } else {
        console.log('ℹ️ [initializeMedia] localVideoRef not yet mounted, useEffect will handle srcObject assignment');
      }
      
      // Start streaming video frames after a short delay to ensure socket is connected
      // Using localStreamRef.current inside startVideoStreaming avoids stale closure issues
      console.log('⏳ [initializeMedia] Waiting 500ms for socket to connect...');
      setTimeout(() => {
        console.log('🎥 [initializeMedia] 500ms delay complete, attempting to start video streaming...');
        startVideoStreaming();
      }, 500);
      
      toast.success('Camera and microphone connected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      console.error('❌ [initializeMedia] Error accessing media devices');
      console.error('   - Error object:', error);
      console.error('   - Error name:', errorName);
      console.error('   - Error message:', errorMessage);
      
      // Try with video only if audio+video fails
      if (errorName === 'NotAllowedError' || errorMessage.includes('Permission denied') || errorMessage.includes('permission')) {
        console.log('🔄 [initializeMedia] Permission denied for audio+video, retrying with video only...');
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15 }
            },
            audio: false
          });
          
          console.log('✅ [initializeMedia] Got video-only stream');
          console.log('   - Video tracks:', videoOnlyStream.getVideoTracks().length);
          localStreamRef.current = videoOnlyStream;
          setLocalStream(videoOnlyStream);
          setMicEnabled(false);
          setVideoEnabled(true);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoOnlyStream;
          }
          
          setTimeout(() => {
            startVideoStreaming();
          }, 500);
          
          toast('Connected with video only (microphone access denied)', { icon: 'ℹ️' });
          return;
        } catch (videoOnlyError) {
          console.error('❌ [initializeMedia] Video-only also failed:', videoOnlyError);
          const videoErrorMsg = videoOnlyError instanceof Error ? videoOnlyError.message : String(videoOnlyError);
          toast.error(`Failed to access camera: ${videoErrorMsg}`);
        }
      }
      
      toast.error(`Failed to access media: ${errorName}`);
      setVideoEnabled(false);
      setMicEnabled(false);
    } finally {
      mediaPermissionCheckRef.current = false;
    }
  };

  const fetchSessionDetails = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        try {
          const parsedAuth = JSON.parse(authStorage);
          token = parsedAuth.state?.token || '';
        } catch (error) {
          console.error('Error parsing auth token:', error);
        }
      }

      // Use dynamic API URL for network access
      const { getApiBaseUrl } = await import('../services/api');
      const apiBaseUrl = getApiBaseUrl();
      
      const response = await fetch(`${apiBaseUrl}/study-sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        
        // Initialize participants with current user
        const initialParticipants = [
          { 
            userId: user?._id, 
            name: `${user?.firstName} ${user?.lastName}`, 
            avatar: user?.avatar,
            isHost: sessionData.host._id === user?._id,
            videoEnabled: true,
            micEnabled: true
          },
        ];
        setParticipants(initialParticipants);
        participantsRef.current = initialParticipants; // Initialize ref
      } else {
        toast.error('Session not found');
        navigate('/sessions');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    const isHost = session?.host?._id === user?._id;
    
    // If the user is the host, end the session for everyone
    if (isHost && id) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        let token = '';
        if (authStorage) {
          try {
            const parsedAuth = JSON.parse(authStorage);
            token = parsedAuth.state?.token || '';
          } catch (error) {
            console.error('Error parsing auth token:', error);
          }
        }

        // Use dynamic API URL for network access
        const { getApiBaseUrl } = await import('../services/api');
        const apiBaseUrl = getApiBaseUrl();
        
        const response = await fetch(`${apiBaseUrl}/study-sessions/${id}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        if (response.ok) {
          toast.success('Session ended for all participants');
        } else {
          toast.error('Failed to end session');
        }
      } catch (error) {
        console.error('Error ending session:', error);
        toast.error('Failed to end session');
      }
    }
    
    // Notify other participants
    if (socket && id) {
      socket.emit('leave-session', id);
    }
    
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop video streaming
    stopVideoStreaming();
    
    // Navigate away
    navigate('/sessions');
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !micEnabled;
      }
    }
    setMicEnabled(!micEnabled);
    
    // Notify other participants about mic status
    if (socket && id) {
      socket.emit('participant-status-change', {
        sessionId: id,
        userId: user?._id,
        micEnabled: !micEnabled,
        videoEnabled
      });
    }
    
    toast.success(micEnabled ? 'Microphone muted' : 'Microphone unmuted');
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoEnabled;
      }
    }
    setVideoEnabled(!videoEnabled);
    
    // Notify other participants about video status
    if (socket && id) {
      socket.emit('participant-status-change', {
        sessionId: id,
        userId: user?._id,
        micEnabled,
        videoEnabled: !videoEnabled
      });
    }
    
    toast.success(videoEnabled ? 'Camera turned off' : 'Camera turned on');
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
        
        // Switch back to camera
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          startVideoStreaming();
        }
        
        toast.success('Screen sharing stopped');
      } else {
        // Stop current video streaming
        stopVideoStreaming();
        
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(stream);
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        
        // Switch local video to screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Start streaming screen share
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        let lastScreenFrameTime = 0;
        const targetFPS = 15;
        const frameInterval = 1000 / targetFPS;

        const sendFrame = (currentTime: number = 0) => {
          if (video.readyState >= video.HAVE_CURRENT_DATA) {
            const now = currentTime || performance.now();
            if (now - lastScreenFrameTime >= frameInterval) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
              
              const liveSocket = socketRef.current;
              const liveSessionId = sessionIdRef.current;
              if (liveSocket && liveSocket.connected && liveSessionId) {
                liveSocket.emit('video-frame', {
                  sessionId: liveSessionId,
                  frameData,
                  userId: userIdRef.current
                });
              }
              
              lastScreenFrameTime = now;
            }
          }
          animationFrameRef.current = requestAnimationFrame(sendFrame);
        };

        video.addEventListener('loadedmetadata', () => {
          console.log('✅ Screen share metadata loaded, starting frame streaming');
          animationFrameRef.current = requestAnimationFrame(sendFrame);
        });
        
        // Listen for when user stops sharing via browser UI
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          screenStreamRef.current = null;
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            startVideoStreaming();
          }
          toast.success('Screen sharing stopped');
        });
        
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setUnreadCount(0);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const pinParticipant = (participantId: string) => {
    setPinnedParticipant(pinnedParticipant === participantId ? null : participantId);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !id) return;

    const message = {
      id: Date.now().toString(),
      sender: `${user?.firstName} ${user?.lastName}`,
      content: newMessage,
      timestamp: new Date(),
      isSystem: false,
      isSelf: true,
      userId: user?._id
    };

    // Send message via socket
    socket.emit('session-message', {
      sessionId: id,
      message
    });

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    if (!chatOpen) {
      setUnreadCount(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading session...</Typography>
      </Box>
    );
  }

  // Calculate total participants (participants array already includes local + remote)
  const totalParticipants = participants.length;
  const getGridColumns = () => {
    if (totalParticipants === 1) return 1;
    if (totalParticipants === 2) return 2;
    if (totalParticipants <= 4) return 2;
    if (totalParticipants <= 6) return 3;
    return 4;
  };

  const gridColumns = getGridColumns();

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'grey.900',
        color: 'white',
        position: 'relative'
      }}
    >
      {/* Enhanced Header */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          borderRadius: 0
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label="LIVE" 
              color="error" 
              size="small"
              sx={{ 
                fontWeight: 'bold',
                animation: 'pulse 2s infinite'
              }}
            />
            <Typography variant="h6" fontWeight="bold">
              {session?.title || 'Study Session'}
            </Typography>
            <Chip 
              icon={<People />}
              label={`${totalParticipants} participant${totalParticipants !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
            />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Toggle Fullscreen">
              <IconButton onClick={toggleFullscreen} color="inherit">
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Session Settings">
              <IconButton color="inherit">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Main Video Grid */}
      <Box 
        sx={{ 
          flex: 1, 
          p: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: 1,
          overflow: 'hidden'
        }}
      >
        {/* Local Video */}
        <Paper
          elevation={3}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2,
            bgcolor: 'grey.800',
            border: isScreenSharing ? `2px solid ${theme.palette.success.main}` : 'none'
          }}
        >
          {(videoEnabled || isScreenSharing) && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isScreenSharing ? 'none' : 'scaleX(-1)',
              }}
            />
          ) : (
            <Box 
              sx={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.800'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'primary.main', 
                  fontSize: '2rem',
                  mb: 2
                }}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Typography variant="h6" color="white">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="grey.400">
                {!localStream ? 'Connecting...' : 'Camera is off'}
              </Typography>
            </Box>
          )}
          
          {/* Local Video Overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box
              sx={{
                bgcolor: alpha(theme.palette.common.black, 0.7),
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Typography variant="caption" fontWeight="bold">
                {user?.firstName} {user?.lastName} (You)
              </Typography>
              {isScreenSharing && (
                <Chip 
                  icon={<ScreenShare />} 
                  label="Screen" 
                  size="small" 
                  color="success"
                />
              )}
            </Box>
            
            <Box display="flex" gap={0.5}>
              {!micEnabled && (
                <Box
                  sx={{
                    bgcolor: 'error.main',
                    p: 0.5,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MicOff fontSize="small" />
                </Box>
              )}
              {!videoEnabled && (
                <Box
                  sx={{
                    bgcolor: 'error.main',
                    p: 0.5,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VideocamOff fontSize="small" />
                </Box>
              )}
            </Box>
          </Box>

          {/* Pin Button */}
          <Tooltip title="Pin Video">
            <Fab
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: alpha(theme.palette.common.black, 0.5),
                '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.7) }
              }}
              onClick={() => pinParticipant(user?._id || '')}
            >
              <PushPin fontSize="small" />
            </Fab>
          </Tooltip>
        </Paper>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([participantSocketId, stream]) => {
          const participant = participants.find(p => p.socketId === participantSocketId);
          return (
            <Paper
              key={participantSocketId}
              elevation={3}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: 'grey.800',
                border: pinnedParticipant === participantSocketId ? `2px solid ${theme.palette.primary.main}` : 'none'
              }}
            >
              <video
                ref={(el) => {
                  if (el) {
                    // Get or create the video element
                    const existingVideo = remoteVideoRefs.current.get(participantSocketId);
                    if (!existingVideo || existingVideo !== el) {
                      // Ensure stream is set and store reference
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        console.log('✅ Video element connected to canvas stream for participant:', participantSocketId, participant?.name);
                      } else if (!stream) {
                        console.warn('⚠️ No stream available for participant:', participantSocketId);
                      }
                      remoteVideoRefs.current.set(participantSocketId, el);
                    } else if (stream && el.srcObject !== stream) {
                      // Stream might have changed, update it
                      el.srcObject = stream;
                      console.log('🔄 Updated video element stream for participant:', participantSocketId);
                    }
                  }
                }}
                autoPlay
                playsInline
                muted={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  willChange: 'contents',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                onLoadedMetadata={() => {
                  console.log('📺 Video metadata loaded for participant:', participantSocketId, participant?.name);
                }}
                onError={(e) => {
                  console.error('❌ Video element error for participant:', participantSocketId, e);
                }}
              />
              
              {/* Remote Video Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box
                  sx={{
                    bgcolor: alpha(theme.palette.common.black, 0.7),
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    {participant?.name || 'Unknown'}
                    {participant?.isHost && (
                      <Chip 
                        label="Host" 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 0.5, height: 16 }}
                      />
                    )}
                  </Typography>
                </Box>
                
                <Box display="flex" gap={0.5}>
                  {!participant?.micEnabled && (
                    <Box
                      sx={{
                        bgcolor: 'error.main',
                        p: 0.5,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MicOff fontSize="small" />
                    </Box>
                  )}
                  {!participant?.videoEnabled && (
                    <Box
                      sx={{
                        bgcolor: 'error.main',
                        p: 0.5,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <VideocamOff fontSize="small" />
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Pin Button */}
              <Tooltip title="Pin Video">
                <Fab
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: alpha(theme.palette.common.black, 0.5),
                    '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.7) }
                  }}
                  onClick={() => pinParticipant(participantSocketId)}
                >
                  <PushPin fontSize="small" />
                </Fab>
              </Tooltip>
            </Paper>
          );
        })}

        {/* Empty slots for waiting participants */}
        {totalParticipants < 6 && (
          <Paper
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.800',
              borderRadius: 2,
              border: `2px dashed ${theme.palette.grey[600]}`,
              p: 2
            }}
          >
            <People sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
            <Typography variant="body2" color="grey.500" textAlign="center">
              Waiting for participants to join...
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Enhanced Control Panel */}
      <Paper 
        sx={{ 
          p: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
          {/* Audio Control */}
          <Tooltip title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}>
            <IconButton 
              size="large" 
              onClick={toggleMic}
              sx={{ 
                bgcolor: micEnabled ? 'success.main' : 'error.main',
                color: 'white',
                '&:hover': {
                  bgcolor: micEnabled ? 'success.dark' : 'error.dark'
                },
                width: 64,
                height: 64,
                transition: 'all 0.3s ease'
              }}
            >
              {micEnabled ? <Mic /> : <MicOff />}
            </IconButton>
          </Tooltip>
          
          {/* Video Control */}
          <Tooltip title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}>
            <IconButton 
              size="large"
              onClick={toggleVideo}
              sx={{ 
                bgcolor: videoEnabled ? 'success.main' : 'error.main',
                color: 'white',
                '&:hover': {
                  bgcolor: videoEnabled ? 'success.dark' : 'error.dark'
                },
                width: 64,
                height: 64,
                transition: 'all 0.3s ease'
              }}
            >
              {videoEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
          </Tooltip>
          
          {/* Screen Share Control */}
          <Tooltip title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}>
            <IconButton 
              size="large"
              onClick={toggleScreenShare}
              sx={{ 
                bgcolor: isScreenSharing ? 'warning.main' : 'action.hover',
                color: isScreenSharing ? 'white' : 'text.primary',
                '&:hover': { 
                  bgcolor: isScreenSharing ? 'warning.dark' : 'action.selected' 
                },
                width: 64,
                height: 64,
                transition: 'all 0.3s ease'
              }}
            >
              {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
            </IconButton>
          </Tooltip>
          
          {/* Chat Control */}
          <Tooltip title="Open Chat">
            <Badge badgeContent={unreadCount} color="error">
              <IconButton 
                size="large"
                onClick={toggleChat}
                sx={{ 
                  bgcolor: chatOpen ? 'info.main' : 'action.hover',
                  color: chatOpen ? 'white' : 'text.primary',
                  '&:hover': { 
                    bgcolor: chatOpen ? 'info.dark' : 'action.selected' 
                  },
                  width: 64,
                  height: 64,
                  transition: 'all 0.3s ease'
                }}
              >
                <Chat />
              </IconButton>
            </Badge>
          </Tooltip>
          
          {/* Sound Control */}
          <Tooltip title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}>
            <IconButton 
              size="large"
              onClick={() => setSoundEnabled(!soundEnabled)}
              sx={{ 
                bgcolor: 'action.hover',
                color: soundEnabled ? 'text.primary' : 'error.main',
                '&:hover': { bgcolor: 'action.selected' },
                width: 64,
                height: 64,
                transition: 'all 0.3s ease'
              }}
            >
              {soundEnabled ? <VolumeUp /> : <VolumeOff />}
            </IconButton>
          </Tooltip>
          
          {/* Settings */}
          <Tooltip title="Session Settings">
            <IconButton 
              size="large"
              sx={{ 
                bgcolor: 'action.hover',
                color: 'text.primary',
                '&:hover': { bgcolor: 'action.selected' },
                width: 64,
                height: 64,
                transition: 'all 0.3s ease'
              }}
            >
              <Settings />
            </IconButton>
          </Tooltip>
          
          {/* End Call */}
          <Tooltip title="End Call">
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<CallEnd />}
              onClick={handleEndCall}
              sx={{ 
                px: 4,
                py: 2,
                fontSize: '1.1rem',
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              End Call
            </Button>
          </Tooltip>
        </Box>
        
        {/* Session Info Bar */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Session Duration: {new Date().toLocaleTimeString()} • 
            {localStream ? ' Media Connected' : ' Connecting to media...'}
            {isScreenSharing && ' • Screen Sharing Active'}
            {totalParticipants > 1 && ` • ${totalParticipants} participants connected`}
          </Typography>
        </Box>
      </Paper>

      {/* Enhanced Chat Drawer */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.background.paper,
            borderLeft: `1px solid ${theme.palette.divider}`
          },
        }}
      >
        {/* Enhanced Chat Header */}
        <Box 
          sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: theme.palette.primary.main,
            color: 'white'
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Chat />
            <Typography variant="h6" fontWeight="bold">Session Chat</Typography>
            <Chip 
              label={`${messages.length} messages`} 
              size="small" 
              sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), color: 'white' }}
            />
          </Box>
          <Tooltip title="Close Chat">
            <IconButton onClick={() => setChatOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Enhanced Messages Area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1, bgcolor: theme.palette.background.default }}>
          <List sx={{ py: 0 }}>
            {messages.map((message) => (
              <ListItem 
                key={message.id} 
                alignItems="flex-start"
                sx={{ 
                  flexDirection: message.isSelf ? 'row-reverse' : 'row',
                  mb: 1,
                  px: 1
                }}
              >
                <ListItemAvatar sx={{ 
                  minWidth: 'auto', 
                  mx: 1,
                  order: message.isSelf ? 1 : 0
                }}>
                  <Avatar sx={{ 
                    bgcolor: message.isSystem ? 'grey.500' : (message.isSelf ? 'primary.main' : 'secondary.main'),
                    width: 36,
                    height: 36
                  }}>
                    {message.isSystem ? '🤖' : message.sender[0]}
                  </Avatar>
                </ListItemAvatar>
                
                <Box
                  sx={{
                    maxWidth: '75%',
                    order: message.isSelf ? 0 : 1
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      bgcolor: message.isSystem ? 
                        alpha(theme.palette.info.main, 0.1) : 
                        (message.isSelf ? theme.palette.primary.main : theme.palette.grey[100]),
                      color: message.isSelf && !message.isSystem ? 'white' : 'text.primary',
                      borderRadius: message.isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: message.isSystem ? `1px solid ${theme.palette.info.main}` : 'none'
                    }}
                  >
                    {!message.isSystem && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: 0.8,
                          fontWeight: 'bold',
                          display: 'block',
                          mb: 0.5
                        }}
                      >
                        {message.sender}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {message.content}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7, 
                        display: 'block', 
                        mt: 0.5,
                        textAlign: message.isSelf ? 'right' : 'left'
                      }}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              </ListItem>
            ))}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        {/* Enhanced Message Input */}
        <Box 
          component="form" 
          onSubmit={sendMessage} 
          sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: theme.palette.background.paper
          }}
        >
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            size="medium"
            multiline
            maxRows={4}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: theme.palette.background.default
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Send Message">
                    <span>
                      <IconButton 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        color="primary"
                        sx={{
                          bgcolor: newMessage.trim() ? 'primary.main' : 'action.disabled',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark'
                          },
                          '&:disabled': {
                            bgcolor: 'action.disabled',
                            color: 'action.disabled'
                          }
                        }}
                      >
                        <Send />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Enter to send • Shift+Enter for new line
          </Typography>
        </Box>
      </Drawer>
    </Box>
  );
};

export default SessionDetail;
