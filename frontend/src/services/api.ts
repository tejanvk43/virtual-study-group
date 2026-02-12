import axios from 'axios';

const HTTPS_PORT = 5443;
const HTTP_REDIRECT_PORT = 5000;

// Dynamically determine API URL based on current hostname for network access
export const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    console.log('Using environment API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Use current hostname for network access (works on mobile devices)
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  const port = window.location.port;
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  
  console.log('🔍 Hostname Detection:');
  console.log('  - window.location.hostname:', hostname);
  console.log('  - window.location.origin:', origin);
  console.log('  - window.location.port:', port);
  console.log('  - window.location.protocol:', window.location.protocol);
  console.log('  - window.location.href:', window.location.href);
  
  let apiUrl;
  
  // Check if hostname is localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiUrl = `https://localhost:${HTTPS_PORT}/api`;
    console.log('📍 Using localhost HTTPS API');
  } else {
    // Network clients use HTTPS on port 5443 (required for camera/mic access)
    apiUrl = `https://${hostname}:${HTTPS_PORT}/api`;
    console.log('🌐 Using network HTTPS API URL:', apiUrl);
  }
  
  console.log('✅ Final API Base URL:', apiUrl);
  return apiUrl;
};

// Calculate API URL dynamically - recalculate on each access for mobile devices
let API_BASE_URL = getApiBaseUrl();
console.log('📌 Initial API URL set to:', API_BASE_URL);

// Recalculate API URL if hostname changes (for mobile network access)
const getCurrentApiBaseUrl = () => {
  const currentUrl = getApiBaseUrl();
  if (currentUrl !== API_BASE_URL) {
    console.warn('⚠️ API URL changed from', API_BASE_URL, 'to', currentUrl);
    API_BASE_URL = currentUrl;
    // Update axios default baseURL
    api.defaults.baseURL = currentUrl;
  }
  return API_BASE_URL;
};

// Debug: show alert on mobile to verify API URL (remove in production)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  console.warn('🌐 MOBILE/NETWORK ACCESS DETECTED');
  console.warn('📱 API URL:', API_BASE_URL);
  console.warn('📱 Frontend URL:', window.location.origin);
  console.warn('📱 Hostname:', window.location.hostname);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase timeout for network requests
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false for cross-origin requests without cookies
});

// Update baseURL before each request to ensure correct URL for network access
api.interceptors.request.use(
  (config) => {
    // ALWAYS recalculate API URL fresh on each request (critical for mobile network access)
    // Don't rely on cached value - get fresh hostname from window.location
    const freshApiUrl = getApiBaseUrl();
    
    // Force update the baseURL
    config.baseURL = freshApiUrl;
    API_BASE_URL = freshApiUrl; // Update cached value
    
    console.log('🔄 Request interceptor - Using API URL:', freshApiUrl);
    console.log('🔄 Current window.location.hostname:', window.location.hostname);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    // Double-check baseURL is correct (should already be set by previous interceptor)
    const freshApiUrl = getApiBaseUrl();
    if (config.baseURL !== freshApiUrl) {
      console.warn('⚠️ baseURL mismatch! Correcting from', config.baseURL, 'to', freshApiUrl);
      config.baseURL = freshApiUrl;
    }
    
    const fullUrl = (config.baseURL || '') + (config.url || '');
    console.log('🌐 Making request to:', fullUrl);
    console.log('📡 Request method:', config.method?.toUpperCase());
    console.log('📦 Request data:', config.data ? 'Present' : 'None');
    console.log('📍 Detected hostname:', window.location.hostname);
    
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        if (parsedToken.state?.token) {
          config.headers.Authorization = `Bearer ${parsedToken.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing token from localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✓ Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error Details:');
    console.error('- Error code:', error.code);
    console.error('- Error message:', error.message);
    console.error('- Response status:', error.response?.status);
    console.error('- Response data:', error.response?.data);
    console.error('- Request URL:', error.config?.url);
    console.error('- Full request URL:', (error.config?.baseURL || '') + (error.config?.url || ''));
    
    // Check for common network error codes
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ERR_CONNECTION_REFUSED' ||
                          error.message.includes('Network Error') ||
                          (!error.response && error.request);
    
    if (isNetworkError) {
      // Get current API URL (recalculate to ensure it's correct)
      const currentApiUrl = getCurrentApiBaseUrl();
      const currentHostname = window.location.hostname;
      
      console.error('🔥 Network error detected - server may be unreachable');
      console.error('- Trying to connect to:', currentApiUrl);
      console.error('- Current hostname:', currentHostname);
      console.error('- Current origin:', window.location.origin);
      console.error(`- Make sure backend is running on port ${HTTPS_PORT}`);
      console.error(`- Check Windows Firewall allows port ${HTTPS_PORT}`);
      console.error('- Verify both devices are on the same network');
      console.error('- Note: Backend uses HTTPS with self-signed certificates');
      console.error(`- Test backend directly: https://${currentHostname}:${HTTPS_PORT}/api/test-network`);
      console.error(`- Optional HTTP redirect: http://${currentHostname}:${HTTP_REDIRECT_PORT}`);
      console.error('- (Ignore browser certificate warnings for self-signed certs)');
      
      const networkError = new Error(`Cannot connect to server at ${currentApiUrl}. Please check:\n1. Backend is running on port ${HTTPS_PORT}\n2. Windows Firewall allows port ${HTTPS_PORT}\n3. Both devices are on the same network\n4. Backend uses HTTPS (https://${currentHostname}:${HTTPS_PORT})\n5. Test: https://${currentHostname}:${HTTPS_PORT}/api/test-network`);
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      (networkError as any).apiUrl = currentApiUrl;
      return Promise.reject(networkError);
    }
    
    if (error.response?.status === 401) {
      // Token is invalid, clear auth state
      localStorage.removeItem('auth-storage');
      window.location.href = '/';
    }
    
    // Extract error message from response
    let errorMessage = 'An error occurred';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      errorMessage = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Attach the extracted message to the error
    (error as any).errorMessage = errorMessage;
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { 
    firstName: string; 
    lastName: string; 
    username: string; 
    email: string; 
    password: string 
  }) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => 
    api.post('/auth/reset-password', { token, password }),
};

// Groups API
export const groupsAPI = {
  createGroup: (groupData: {
    name: string;
    description?: string;
    subject: string;
    category?: string;
    privacy?: string;
    maxMembers?: number;
  }) => api.post('/groups', groupData),
  
  getPublicGroups: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    subject?: string;
  }) => api.get('/groups/public', { params }),
  
  getUserGroups: () => api.get('/groups/my-groups'),
  
  getGroupById: (groupId: string) => api.get(`/groups/${groupId}`),
  
  joinGroup: (groupId: string) => api.post(`/groups/${groupId}/join`),
  
  leaveGroup: (groupId: string) => api.post(`/groups/${groupId}/leave`),
  
  updateGroup: (groupId: string, updates: any) => api.put(`/groups/${groupId}`, updates),
  
  deleteGroup: (groupId: string) => api.delete(`/groups/${groupId}`),
};

// Messages API
export const messagesAPI = {
  getGroupMessages: (groupId: string, params?: {
    page?: number;
    limit?: number;
  }) => api.get(`/chat/group/${groupId}`, { params }),
  
  sendMessage: (messageData: {
    content: string;
    groupId: string;
    type?: string;
    replyTo?: string;
  }) => api.post('/chat/send', messageData),
  
  editMessage: (messageId: string, content: string) => 
    api.put(`/chat/${messageId}`, { content }),
  
  deleteMessage: (messageId: string) => api.delete(`/chat/${messageId}`),
  
  addReaction: (messageId: string, emoji: string) => 
    api.post(`/chat/${messageId}/react`, { emoji }),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData: any) => api.put('/users/profile', userData),
  uploadAvatar: (formData: FormData) => api.post('/users/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query: string) => api.get(`/users/search?q=${query}`),
  getDashboard: () => api.get('/users/dashboard'),
  getStats: () => api.get('/users/stats'),
  recordActivity: () => api.post('/users/record-activity'),
  getActivity: () => api.get('/users/activity'),
};

// Study Sessions API
export const sessionsAPI = {
  createSession: (sessionData: any) => api.post('/study-sessions', sessionData),
  getSessions: (params?: any) => api.get('/study-sessions/my-sessions', { params }),
  getUpcomingSessions: (params?: any) => api.get('/study-sessions/upcoming', { params }),
  getPastSessions: (params?: any) => api.get('/study-sessions/past', { params }),
  getGroupSessions: (groupId: string, params?: any) => api.get(`/study-sessions/group/${groupId}`, { params }),
  getSessionById: (sessionId: string) => api.get(`/study-sessions/${sessionId}`),
  updateSession: (sessionId: string, updates: any) => api.put(`/study-sessions/${sessionId}`, updates),
  deleteSession: (sessionId: string) => api.delete(`/study-sessions/${sessionId}`),
  joinSession: (sessionId: string) => api.post(`/study-sessions/${sessionId}/join`),
  leaveSession: (sessionId: string) => api.post(`/study-sessions/${sessionId}/leave`),
};

export default api;
