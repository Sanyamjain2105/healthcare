import { create } from 'zustand';
import api from '@/lib/api';

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  allergies: string[];
  medications: string[];
  assignedProvider: {
    id: string;
    name: string;
    specialty: string;
  } | null;
  goals: Goal[];
  reminders: Reminder[];
}

export interface Goal {
  id: string;
  title: string;
  target: string;
  progress: number;
  lastLoggedAt?: string;
}

export interface Reminder {
  id: string;
  type: string;
  dueAt: string;
  message: string;
  sent: boolean;
}

export interface DashboardData {
  patient: PatientProfile;
  goals: Goal[];
  upcomingReminders: Reminder[];
  preventive: Reminder[];
  tipOfTheDay: string;
}

interface PatientState {
  profile: PatientProfile | null;
  dashboard: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  
  fetchProfile: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  updateProfile: (data: Partial<PatientProfile>) => Promise<void>;
  createGoal: (title: string, target?: string) => Promise<void>;
  logGoalProgress: (goalId: string, progress: number) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set) => ({
  profile: null,
  dashboard: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/patients/me');
      set({ profile: response.data.patient, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch profile';
      set({ error: message, isLoading: false });
    }
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/patients/dashboard');
      set({ dashboard: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch dashboard';
      set({ error: message, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/patients/me', data);
      set({ profile: response.data.patient, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile';
      set({ error: message, isLoading: false });
    }
  },

  createGoal: async (title, target) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/api/patients/goals', { title, target });
      // Refetch dashboard to get updated goals
      const response = await api.get('/api/patients/dashboard');
      set({ dashboard: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create goal';
      set({ error: message, isLoading: false });
    }
  },

  logGoalProgress: async (goalId, progress) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/api/patients/goals/${goalId}/log`, { progress });
      // Refetch dashboard to get updated goals
      const response = await api.get('/api/patients/dashboard');
      set({ dashboard: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to log progress';
      set({ error: message, isLoading: false });
    }
  },
}));
