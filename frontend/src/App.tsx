import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, Toolbar } from '@mui/material';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import StudySessions from './pages/StudySessions';
import SessionDetail from './pages/SessionDetail';
import Profile from './pages/Profile';
import AIAssistant from './pages/AIAssistant';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <div className="loading-spinner" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <SocketProvider>
      <Box display="flex" height="100vh">
        <Sidebar 
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          variant={isMobile ? 'temporary' : 'persistent'}
        />
        <Box 
          display="flex" 
          flexDirection="column" 
          flex={1}
          sx={{
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            marginLeft: !isMobile && sidebarOpen ? 0 : !isMobile ? '-280px' : 0,
          }}
        >
          <Navbar onMenuClick={handleSidebarToggle} />
          <Box 
            component="main" 
            flex={1} 
            overflow="auto" 
            bgcolor="background.default"
            sx={{ p: 3 }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/sessions" element={<StudySessions />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </SocketProvider>
  );
}

export default App;
