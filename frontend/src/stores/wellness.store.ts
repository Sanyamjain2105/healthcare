import { create } from 'zustand';
import api from '@/lib/api';

export interface WellnessData {
  id: string;
  date: string;
  steps: number;
  stepsGoal: number;
  stepsProgress: number;
  activeMinutes: number;
  activeMinutesGoal: number;
  activeProgress: number;
  sleepHours: number;
  sleepGoal: number;
  sleepProgress: number;
  waterIntake: number;
  waterGoal: number;
  waterProgress: number;
  notes?: string;
}

export interface WeeklySummary {
  averageSteps: number;
  averageActiveMinutes: number;
  averageSleepHours: number;
  daysLogged: number;
  stepsGoalMetDays: number;
  sleepGoalMetDays: number;
}

interface WellnessState {
  today: WellnessData | null;
  weekly: WeeklySummary | null;
  history: WellnessData[];
  isLoading: boolean;
  error: string | null;
  
  fetchToday: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchHistory: (days?: number) => Promise<void>;
  updateToday: (data: Partial<WellnessData>) => Promise<void>;
  logActivity: (data: { steps?: number; activeMinutes?: number; waterIntake?: number }) => Promise<void>;
  logWellness: (data: { steps?: number; activeMinutes?: number; sleepHours?: number; waterIntake?: number; notes?: string }) => Promise<void>;
}

export const useWellnessStore = create<WellnessState>((set, get) => ({
  today: null,
  weekly: null,
  history: [],
  isLoading: false,
  error: null,

  fetchToday: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/patients/wellness/today');
      set({ today: response.data.wellness, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch wellness data';
      set({ error: message, isLoading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const response = await api.get('/api/patients/wellness/summary');
      set({ 
        today: response.data.today, 
        weekly: response.data.weekly 
      });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch summary';
      set({ error: message });
    }
  },

  fetchHistory: async (days = 7) => {
    try {
      const response = await api.get(`/api/patients/wellness/history?days=${days}`);
      set({ history: response.data.history });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch history';
      set({ error: message });
    }
  },

  updateToday: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/patients/wellness/today', data);
      set({ today: response.data.wellness, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update wellness data';
      set({ error: message, isLoading: false });
    }
  },

  logActivity: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/patients/wellness/log', data);
      set({ today: response.data.wellness, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to log activity';
      set({ error: message, isLoading: false });
    }
  },

  logWellness: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/api/patients/wellness/today', data);
      set({ today: response.data.wellness, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to log wellness';
      set({ error: message, isLoading: false });
    }
  },
}));
