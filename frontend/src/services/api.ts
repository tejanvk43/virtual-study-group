import axios from 'axios';

// Dynamically determine API URL based on current hostname for network access
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    console.log('Using environment API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Force localhost for development to avoid network issues
  const hostname = window.location.hostname;
  let apiUrl;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiUrl = 'http://localhost:5000/api';
  } else {
    apiUrl = `http://${hostname}:5000/api`;
  }
  
  console.log('API Base URL:', apiUrl);
  console.log('Current hostname:', hostname);
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('Configured API URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase timeout for network requests
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false for cross-origin requests without cookies
});

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const fullUrl = (config.baseURL || '') + (config.url || '');
    console.log('Making request to:', fullUrl);
    console.log('Request method:', config.method?.toUpperCase());
    console.log('Request data:', config.data);
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
      console.error('🔥 Network error detected - server may be unreachable');
      console.error('- Trying to connect to:', API_BASE_URL);
      console.error('- Make sure backend is running on port 5000');
      
      const networkError = new Error(`Cannot connect to server. Please make sure the server is running.`);
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
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

// AI API
export const aiAPI = {
  sendMessage: (message: string, context?: any) => 
    api.post('/ai/chat', { message, context }),
  getStudyHelp: (topic: string, difficulty: string) => 
    api.post('/ai/study-help', { topic, difficulty }),
  generateQuiz: (topic: string, questionCount: number) => 
    api.post('/ai/generate-quiz', { topic, questionCount }),
};

export default api;
