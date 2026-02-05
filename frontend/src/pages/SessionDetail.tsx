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
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    fetchSessionDetails();
    initializeMedia(); // Initialize camera when user intentionally joins a session
    setupSocketListeners();
    
    // Initialize with welcome message
    setMessages([
      {
        id: '1',
        sender: 'System',
        content: 'Welcome to the study session! Use this chat to communicate with other participants.',
        timestamp: new Date(),
        isSystem: true
      }
    ]);
    
    return () => {
      // Cleanup media streams when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => {
        if (pc.signalingState !== 'closed') {
          pc.close();
        }
      });
      peerConnectionsRef.current.clear();
      
      // Remove all socket listeners
      if (socket) {
        socket.off('existing-participants');
        socket.off('participant-joined');
        socket.off('participant-left');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        socket.off('session-message');
        socket.off('session-force-end');
        
        // Leave the session room
        if (id) {
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

  // Socket event listeners for real-time video calling
  const setupSocketListeners = () => {
    if (!socket || !id) return;

    // Join the session room
    socket.emit('join-session', { sessionId: id, userId: user?._id });

    // Handle existing participants (when you join)
    socket.on('existing-participants', async (existingParticipants) => {
      console.log('Existing participants:', existingParticipants);
      for (const participant of existingParticipants) {
        if (participant.userId !== user?._id) {
          setParticipants(prev => [...prev, participant]);
          // Create peer connection and send offer to existing participant
          await createPeerConnection(participant.socketId);
        }
      }
    });

    // Handle new participant joining (when someone else joins)
    socket.on('participant-joined', async (participant) => {
      console.log('New participant joined:', participant);
      setParticipants(prev => [...prev, participant]);
      
      // Note: Don't create offer here, the new participant will send offers to us
    });

    // Handle participant leaving
    socket.on('participant-left', (participantId) => {
      console.log('Participant left:', participantId);
      setParticipants(prev => prev.filter(p => p.userId !== participantId));
      
      // Close peer connection
      const pc = peerConnections.get(participantId);
      if (pc) {
        pc.close();
        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(participantId);
          peerConnectionsRef.current = newMap;
          return newMap;
        });
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
    });

    // WebRTC signaling
    socket.on('offer', async ({ offer, from }) => {
      await handleOffer(offer, from);
    });

    socket.on('answer', async ({ answer, from }) => {
      await handleAnswer(answer, from);
    });

    socket.on('ice-candidate', async ({ candidate, from }) => {
      await handleIceCandidate(candidate, from);
    });

    // Chat messages
    socket.on('session-message', (message) => {
      setMessages(prev => [...prev, message]);
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Handle force end from host
    socket.on('session-force-end', (data) => {
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

  // Create peer connection for video calling
  const createPeerConnection = async (participantSocketId: string) => {
    console.log('Creating peer connection for:', participantSocketId);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', participantSocketId);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(participantSocketId, remoteStream)));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate to:', participantSocketId);
        socket.emit('ice-candidate', {
          sessionId: id,
          candidate: event.candidate,
          to: participantSocketId
        });
      }
    };

    setPeerConnections(prev => {
      const newMap = new Map(prev.set(participantSocketId, pc));
      peerConnectionsRef.current = newMap;
      return newMap;
    });

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (socket) {
      console.log('Sending offer to:', participantSocketId);
      socket.emit('offer', {
        sessionId: id,
        offer,
        to: participantSocketId
      });
    }

    return pc;
  };

  // Handle incoming offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    console.log('Received offer from:', from);
    const pc = peerConnections.get(from) || await createBasicPeerConnection(from);
    
    // Check if connection is still valid
    if (!pc || pc.signalingState === 'closed') {
      console.warn('Peer connection is closed or invalid for:', from);
      return;
    }
    
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socket) {
        console.log('Sending answer to:', from);
        socket.emit('answer', {
          sessionId: id,
          answer,
          to: from
        });
      }
    } catch (error) {
      console.error('Error handling offer from:', from, error);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    console.log('Received answer from:', from);
    const pc = peerConnections.get(from);
    if (!pc) {
      console.error('No peer connection found for:', from);
      return;
    }
    
    // Check if connection is still valid
    if (pc.signalingState === 'closed') {
      console.warn('Peer connection is closed for:', from);
      return;
    }
    
    try {
      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer from:', from, error);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    console.log('Received ICE candidate from:', from);
    const pc = peerConnections.get(from);
    if (!pc) {
      console.error('No peer connection found for ICE candidate from:', from);
      return;
    }
    
    // Check if connection is still valid
    if (pc.signalingState === 'closed') {
      console.warn('Peer connection is closed for ICE candidate from:', from);
      return;
    }
    
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate from:', from, error);
    }
  };

  // Create basic peer connection without offering
  const createBasicPeerConnection = async (participantSocketId: string) => {
    console.log('Creating basic peer connection for:', participantSocketId);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      console.log('Received remote track from:', participantSocketId);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(participantSocketId, remoteStream)));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          sessionId: id,
          candidate: event.candidate,
          to: participantSocketId
        });
      }
    };

    setPeerConnections(prev => {
      const newMap = new Map(prev.set(participantSocketId, pc));
      peerConnectionsRef.current = newMap;
      return newMap;
    });
    return pc;
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast.success('Camera and microphone connected');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera or microphone');
      setVideoEnabled(false);
      setMicEnabled(false);
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

      const response = await fetch(`http://localhost:5000/api/study-sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        
        // Initialize participants with current user
        setParticipants([
          { 
            userId: user?._id, 
            name: `${user?.firstName} ${user?.lastName}`, 
            avatar: user?.avatar,
            isHost: sessionData.host._id === user?._id,
            videoEnabled: true,
            micEnabled: true
          },
        ]);
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

        const response = await fetch(`http://localhost:5000/api/study-sessions/${id}/end`, {
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
    
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    
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
        
        // Switch back to camera for all peer connections
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          peerConnections.forEach(async (pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && videoTrack) {
              await sender.replaceTrack(videoTrack);
            }
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }
        
        toast.success('Screen sharing stopped');
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(stream);
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        
        // Replace video track in all peer connections
        const videoTrack = stream.getVideoTracks()[0];
        peerConnections.forEach(async (pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        });
        
        // Switch local video to screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Listen for when user stops sharing via browser UI
        videoTrack.addEventListener('ended', () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          screenStreamRef.current = null;
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            
            // Switch back to camera for all peer connections
            const cameraTrack = localStream.getVideoTracks()[0];
            peerConnections.forEach(async (pc) => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && cameraTrack) {
                await sender.replaceTrack(cameraTrack);
              }
            });
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

  const totalParticipants = participants.length + remoteStreams.size;
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
          console.log('Rendering remote video for:', participantSocketId, 'Stream:', stream);
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
                    el.srcObject = stream;
                    remoteVideoRefs.current.set(participantSocketId, el);
                  }
                }}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
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
