import api from './api';
import { StudySession } from '../types';

export const studySessionService = {
  // Get all upcoming sessions
  getUpcomingSessions: async (): Promise<StudySession[]> => {
    const response = await api.get('/study-sessions/upcoming');
    return response.data;
  },

  // Get past sessions
  getPastSessions: async (): Promise<StudySession[]> => {
    const response = await api.get('/study-sessions/past');
    return response.data;
  },

  // Get sessions where user is host or participant
  getMySessions: async (): Promise<StudySession[]> => {
    const response = await api.get('/study-sessions/my-sessions');
    return response.data;
  },

  // Create a new study session
  createSession: async (sessionData: Omit<StudySession, '_id' | 'createdAt' | 'updatedAt'>): Promise<StudySession> => {
    const response = await api.post('/study-sessions', sessionData);
    return response.data;
  },

  // Update a study session
  updateSession: async (sessionId: string, sessionData: Partial<StudySession>): Promise<StudySession> => {
    const response = await api.put(`/study-sessions/${sessionId}`, sessionData);
    return response.data;
  },

  // Delete/Cancel a study session
  cancelSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/study-sessions/${sessionId}`);
  },

  // Join a study session
  joinSession: async (sessionId: string): Promise<StudySession> => {
    const response = await api.post(`/study-sessions/${sessionId}/join`);
    return response.data;
  },

  // Leave a study session
  leaveSession: async (sessionId: string): Promise<void> => {
    await api.post(`/study-sessions/${sessionId}/leave`);
  }
};
