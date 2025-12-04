import { create } from 'zustand';
import api from '@/lib/api';

export interface ProviderProfile {
  id: string;
  name: string;
  specialty: string;
  patientCount: number;
  patients: PatientSummary[];
}

export interface PatientSummary {
  id: string;
  name: string;
  age: number;
}

export interface PatientDetail {
  id: string;
  name: string;
  age: number;
  allergies: string[];
  medications: string[];
  goals: {
    id: string;
    title: string;
    target: string;
    progress: number;
    lastLoggedAt?: string;
  }[];
  reminders: {
    id: string;
    type: string;
    dueAt: string;
    message: string;
    sent: boolean;
  }[];
}

export interface PatientWellness {
  patient: { id: string; name: string };
  summary: {
    daysLogged: number;
    averageSteps: number;
    averageSleep: number;
    averageWater: number;
    averageActiveMinutes: number;
  };
  logs: {
    id: string;
    date: string;
    steps: number;
    sleepHours: number;
    waterIntake: number;
    activeMinutes: number;
    notes?: string;
  }[];
}

export interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  title: string;
  description?: string;
  patient?: {
    id: string;
    name: string;
    age?: number;
  };
}

interface ProviderState {
  profile: ProviderProfile | null;
  patients: PatientDetail[];
  selectedPatient: PatientDetail | null;
  patientWellness: PatientWellness | null;
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  
  fetchProfile: () => Promise<void>;
  fetchPatients: () => Promise<void>;
  fetchPatientDetail: (patientId: string) => Promise<void>;
  fetchPatientWellness: (patientId: string) => Promise<void>;
  fetchAppointments: () => Promise<void>;
  updateCompliance: (patientId: string, status: string, goalId?: string, note?: string) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: string) => Promise<void>;
}

export const useProviderStore = create<ProviderState>((set) => ({
  profile: null,
  patients: [],
  selectedPatient: null,
  patientWellness: null,
  appointments: [],
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/providers/me');
      set({ profile: response.data.provider, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch profile';
      set({ error: message, isLoading: false });
    }
  },

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/providers/patients');
      set({ patients: response.data.patients, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch patients';
      set({ error: message, isLoading: false });
    }
  },

  fetchPatientDetail: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/providers/patients/${patientId}`);
      set({ selectedPatient: response.data.patient, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch patient';
      set({ error: message, isLoading: false });
    }
  },

  fetchAppointments: async () => {
    try {
      const response = await api.get('/api/appointments/provider?upcoming=true');
      set({ appointments: response.data.appointments });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch appointments';
      set({ error: message });
    }
  },

  updateCompliance: async (patientId, status, goalId, note) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/api/providers/patients/${patientId}/compliance`, {
        status,
        goalId,
        note,
      });
      // Refresh patients list
      const response = await api.get('/api/providers/patients');
      set({ patients: response.data.patients, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update compliance';
      set({ error: message, isLoading: false });
    }
  },

  fetchPatientWellness: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/providers/patients/${patientId}/wellness`);
      set({ patientWellness: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch wellness';
      set({ error: message, isLoading: false });
    }
  },

  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/appointments/provider/${appointmentId}`, { status });
      // Refresh appointments
      const response = await api.get('/api/appointments/provider?upcoming=true');
      set({ appointments: response.data.appointments || [], isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update appointment';
      set({ error: message, isLoading: false });
    }
  },
}));
