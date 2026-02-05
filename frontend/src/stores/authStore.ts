import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        console.log('🔥 LOGIN ATTEMPT STARTED');
        console.log('- Email:', email);
        console.log('- API baseURL:', api.defaults.baseURL);
        console.log('- Full URL would be:', `${api.defaults.baseURL}/auth/login`);
        console.log('- Current window.location:', window.location.href);
        
        try {
          console.log('🚀 Making login API call...');
          const response = await api.post('/auth/login', { email, password });
          console.log('✅ Login API response received:', response.data);
          const { user, token } = response.data;
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Login successful!');
        } catch (error: any) {
          console.error('❌ LOGIN ERROR - Full details:');
          console.error('- Error object:', error);
          console.error('- Error code:', error.code);
          console.error('- Error message:', error.message);
          console.error('- Error response:', error.response);
          console.error('- Error config:', error.config);
          console.error('- Is network error?:', error.isNetworkError);
          console.error('- Request URL attempted:', error.config?.url);
          console.error('- Request baseURL:', error.config?.baseURL);
          
          let errorMessage = 'Login failed';
          if (error.isNetworkError) {
            errorMessage = 'Cannot connect to server. Please make sure the server is running.';
          } else if (error.errorMessage) {
            errorMessage = error.errorMessage;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.errors?.[0]?.msg) {
            errorMessage = error.response.data.errors[0].msg;
          } else if (error.message && !error.message.includes('Request failed')) {
            errorMessage = error.message;
          }
          
          console.error('🔥 Final error message shown to user:', errorMessage);
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        try {
          console.log('Attempting registration to:', api.defaults.baseURL);
          console.log('Full URL:', `${api.defaults.baseURL}/auth/register`);
          console.log('Registration data:', userData);
          const response = await api.post('/auth/register', userData);
          console.log('Registration response:', response.data);
          const { user, token } = response.data;
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Registration successful!');
        } catch (error: any) {
          console.error('Registration error details:');
          console.error('- Full error:', error);
          console.error('- Error response:', error.response);
          console.error('- Error message:', error.message);
          console.error('- Is network error:', error.isNetworkError);
          console.error('- Extracted message:', error.errorMessage);
          
          let errorMessage = 'Registration failed';
          if (error.isNetworkError) {
            errorMessage = 'Cannot connect to server. Please make sure the server is running.';
          } else if (error.errorMessage) {
            errorMessage = error.errorMessage;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.errors?.[0]?.msg) {
            errorMessage = error.response.data.errors[0].msg;
          } else if (error.message && !error.message.includes('Request failed')) {
            errorMessage = error.message;
          }
          
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: () => {
        // Remove token from API headers
        delete api.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        toast.success('Logged out successfully');
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        try {
          const response = await api.put('/auth/profile', userData);
          const updatedUser = response.data;
          
          set({
            user: updatedUser,
          });
          
          toast.success('Profile updated successfully!');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to update profile');
          throw error;
        }
      },

      checkAuth: async () => {
        try {
          const token = get().token;
          if (!token) {
            set({ isLoading: false });
            return;
          }

          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const response = await api.get('/auth/me');
          const user = response.data;
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token is invalid, clear auth state
          delete api.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);

// Initialize auth check on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
