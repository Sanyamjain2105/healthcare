import { create } from 'zustand';
import api from '@/lib/api';

export interface Appointment {
  id: string;
  patient?: {
    id: string;
    name: string;
  };
  provider?: {
    id: string;
    name: string;
    specialty: string;
  };
  scheduledAt: string;
  title: string;
  type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  duration: number;
  description?: string;
  notes?: string;
  createdAt: string;
}

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  
  fetchPatientAppointments: () => Promise<void>;
  fetchProviderAppointments: () => Promise<void>;
  createAppointment: (data: { scheduledAt: string; title: string; type?: string; description?: string }) => Promise<void>;
  cancelAppointment: (id: string, reason?: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  isLoading: false,
  error: null,

  fetchPatientAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/appointments/patient');
      set({ appointments: response.data.appointments || [], isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch appointments';
      set({ error: message, isLoading: false });
    }
  },

  fetchProviderAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/appointments/provider');
      set({ appointments: response.data.appointments || [], isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch appointments';
      set({ error: message, isLoading: false });
    }
  },

  createAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/api/appointments/patient', data);
      // Refetch appointments
      const response = await api.get('/api/appointments/patient');
      set({ appointments: response.data.appointments || [], isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create appointment';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  cancelAppointment: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/appointments/patient/${id}`, { data: { reason } });
      // Refetch appointments
      const response = await api.get('/api/appointments/patient');
      set({ appointments: response.data.appointments || [], isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to cancel appointment';
      set({ error: message, isLoading: false });
    }
  },
}));
