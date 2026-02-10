import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Dynamically determine socket URL based on current hostname for network access
      const hostname = window.location.hostname;
      // Always use HTTPS:5443 for both localhost and network clients (required for camera/mic)
      const socketUrl = process.env.REACT_APP_SOCKET_URL || `https://${hostname}:5443`;
      console.log('🔌 Connecting to socket:', socketUrl);
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        timeout: 30000, // Increased timeout for network connections
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        rejectUnauthorized: false, // Allow self-signed certificates in development
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        // Join user to their personal room
        newSocket.emit('join-user', user._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
