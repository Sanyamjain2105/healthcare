'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePatientStore } from '@/stores/patient.store';
import { useWellnessStore } from '@/stores/wellness.store';
import { useAppointmentStore } from '@/stores/appointment.store';
import { getGreeting, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';

// Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { dashboard, fetchDashboard, updateProfile, createGoal, logGoalProgress, isLoading: dashboardLoading } = usePatientStore();
  const { today, weekly, fetchSummary, logWellness, isLoading: wellnessLoading } = useWellnessStore();
  const { appointments, fetchPatientAppointments, createAppointment, cancelAppointment } = useAppointmentStore();

  // Modal states
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{ id: string; title: string; progress: number } | null>(null);

  // Form states
  const [wellnessForm, setWellnessForm] = useState({ steps: 0, activeMinutes: 0, sleepHours: 0, waterIntake: 0, notes: '' });
  const [profileForm, setProfileForm] = useState({ name: '', age: '', allergies: '', medications: '' });
  const [goalForm, setGoalForm] = useState({ title: '', target: '' });
  const [progressForm, setProgressForm] = useState({ progress: 0 });
  const [appointmentForm, setAppointmentForm] = useState({ title: '', scheduledAt: '', type: 'checkup', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'patient') {
      router.push('/provider/dashboard');
      return;
    }
    
    fetchDashboard();
    fetchSummary();
    fetchPatientAppointments();
  }, [isAuthenticated, user, router, fetchDashboard, fetchSummary, fetchPatientAppointments]);

  // Initialize profile form when dashboard loads
  useEffect(() => {
    if (dashboard?.patient) {
      setProfileForm({
        name: dashboard.patient.name || '',
        age: dashboard.patient.age?.toString() || '',
        allergies: dashboard.patient.allergies?.join(', ') || '',
        medications: dashboard.patient.medications?.join(', ') || ''
      });
    }
  }, [dashboard]);

  // Initialize wellness form with today's data
  useEffect(() => {
    if (today) {
      setWellnessForm({
        steps: today.steps || 0,
        activeMinutes: today.activeMinutes || 0,
        sleepHours: today.sleepHours || 0,
        waterIntake: today.waterIntake || 0,
        notes: today.notes || ''
      });
    }
  }, [today]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSaveWellness = async () => {
    setSaving(true);
    try {
      await logWellness(wellnessForm);
      await fetchSummary();
      setShowWellnessModal(false);
    } catch (err) {
      console.error('Failed to save wellness:', err);
    }
    setSaving(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: profileForm.name,
        age: profileForm.age ? parseInt(profileForm.age) : undefined,
        allergies: profileForm.allergies ? profileForm.allergies.split(',').map(s => s.trim()) : [],
        medications: profileForm.medications ? profileForm.medications.split(',').map(s => s.trim()) : []
      });
      await fetchDashboard();
      setShowProfileModal(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
    setSaving(false);
  };

  const handleCreateGoal = async () => {
    if (!goalForm.title) return;
    setSaving(true);
    try {
      await createGoal(goalForm.title, goalForm.target);
      await fetchDashboard();
      setGoalForm({ title: '', target: '' });
      setShowGoalModal(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
    setSaving(false);
  };

  const handleUpdateGoalProgress = async () => {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      await logGoalProgress(selectedGoal.id, progressForm.progress);
      await fetchDashboard();
      setShowProgressModal(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to update goal progress:', err);
    }
    setSaving(false);
  };

  const handleCreateAppointment = async () => {
    if (!appointmentForm.title || !appointmentForm.scheduledAt) return;
    setSaving(true);
    try {
      await createAppointment(appointmentForm);
      await fetchPatientAppointments();
      setAppointmentForm({ title: '', scheduledAt: '', type: 'checkup', description: '' });
      setShowAppointmentModal(false);
    } catch (err) {
      console.error('Failed to create appointment:', err);
    }
    setSaving(false);
  };

  const openProgressModal = (goal: { id: string; title: string; progress: number }) => {
    setSelectedGoal(goal);
    setProgressForm({ progress: goal.progress });
    setShowProgressModal(true);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const isLoading = dashboardLoading || wellnessLoading;
  const patientName = dashboard?.patient?.name || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HealthSync</h1>
                <p className="text-sm text-gray-500">Preventive Care Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {patientName}!
          </h2>
          <p className="text-gray-500 mt-1">Here&apos;s your health overview for today.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Wellness Tracker */}
              <Card title="Today's Wellness" subtitle="Track your daily progress">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Steps */}
                  <div className="text-center">
                    <CircularProgress
                      value={today?.steps || 0}
                      max={today?.stepsGoal || 10000}
                      size={100}
                      color="primary"
                      label="Steps"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      {today?.steps?.toLocaleString() || 0} / {today?.stepsGoal?.toLocaleString() || 10000}
                    </p>
                  </div>

                  {/* Active Minutes */}
                  <div className="text-center">
                    <CircularProgress
                      value={today?.activeMinutes || 0}
                      max={today?.activeMinutesGoal || 30}
                      size={100}
                      color="success"
                      label="Active"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      {today?.activeMinutes || 0} / {today?.activeMinutesGoal || 30} min
                    </p>
                  </div>

                  {/* Sleep */}
                  <div className="text-center">
                    <CircularProgress
                      value={today?.sleepHours || 0}
                      max={today?.sleepGoal || 8}
                      size={100}
                      color="warning"
                      label="Sleep"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      {today?.sleepHours || 0} / {today?.sleepGoal || 8} hrs
                    </p>
                  </div>

                  {/* Water */}
                  <div className="text-center">
                    <CircularProgress
                      value={today?.waterIntake || 0}
                      max={today?.waterGoal || 8}
                      size={100}
                      color="primary"
                      label="Water"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      {today?.waterIntake || 0} / {today?.waterGoal || 8} cups
                    </p>
                  </div>
                </div>

                {/* Weekly Summary */}
                {weekly && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">This Week</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Avg Steps</p>
                        <p className="font-semibold">{weekly.averageSteps.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Active</p>
                        <p className="font-semibold">{weekly.averageActiveMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Sleep</p>
                        <p className="font-semibold">{weekly.averageSleepHours} hrs</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Goals Met</p>
                        <p className="font-semibold">{weekly.stepsGoalMetDays}/7 days</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Health Goals */}
              <Card title="Health Goals" subtitle="Your personalized goals">
                {dashboard?.goals && dashboard.goals.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.goals.map((goal) => (
                      <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{goal.target}</span>
                            <button
                              onClick={() => openProgressModal(goal)}
                              className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                        <ProgressBar
                          value={goal.progress}
                          color={goal.progress >= 100 ? 'success' : 'primary'}
                          showLabel
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No goals set yet. Add a goal to start tracking!
                  </p>
                )}
              </Card>

              {/* Appointments */}
              <Card title="Upcoming Appointments" subtitle="Your scheduled visits">
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed').slice(0, 3).map((apt) => (
                      <div key={apt.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{apt.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(apt.scheduledAt).toLocaleDateString()} at {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {apt.status}
                          </span>
                        </div>
                        <button
                          onClick={() => cancelAppointment(apt.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No upcoming appointments. Schedule one!
                  </p>
                )}
                <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => setShowAppointmentModal(true)}>
                  📅 Schedule Appointment
                </Button>
              </Card>

              {/* Health Tip */}
              <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Tip of the Day</h3>
                    <p className="text-sm text-white/90">
                      {dashboard?.tipOfTheDay || 'Stay hydrated and take regular breaks!'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Preventive Reminders */}
              <Card title="Upcoming Reminders" subtitle="Don't miss these!">
                {dashboard?.upcomingReminders && dashboard.upcomingReminders.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.upcomingReminders.slice(0, 5).map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-start space-x-3 p-3 bg-warning-50 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-warning-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{reminder.message}</p>
                          <p className="text-xs text-gray-500">{formatDate(reminder.dueAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming reminders</p>
                )}
              </Card>

              {/* Provider Info */}
              {dashboard?.patient?.assignedProvider && (
                <Card title="Your Provider">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {dashboard.patient.assignedProvider.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {dashboard.patient.assignedProvider.specialty}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Quick Actions */}
              <Card title="Quick Actions">
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => setShowWellnessModal(true)}>
                    📊 Log Today&apos;s Wellness
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => setShowProfileModal(true)}>
                    👤 Update Profile
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => setShowGoalModal(true)}>
                    🎯 Add New Goal
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Wellness Modal */}
        <Modal isOpen={showWellnessModal} onClose={() => setShowWellnessModal(false)} title="Log Today's Wellness">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
              <input
                type="number"
                value={wellnessForm.steps}
                onChange={(e) => setWellnessForm({ ...wellnessForm, steps: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Minutes</label>
              <input
                type="number"
                value={wellnessForm.activeMinutes}
                onChange={(e) => setWellnessForm({ ...wellnessForm, activeMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sleep Hours</label>
              <input
                type="number"
                step="0.5"
                value={wellnessForm.sleepHours}
                onChange={(e) => setWellnessForm({ ...wellnessForm, sleepHours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Water Intake (cups)</label>
              <input
                type="number"
                value={wellnessForm.waterIntake}
                onChange={(e) => setWellnessForm({ ...wellnessForm, waterIntake: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={wellnessForm.notes}
                onChange={(e) => setWellnessForm({ ...wellnessForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={handleSaveWellness} disabled={saving}>
              {saving ? 'Saving...' : 'Save Wellness Log'}
            </Button>
          </div>
        </Modal>

        {/* Profile Modal */}
        <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Update Profile">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                value={profileForm.age}
                onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma-separated)</label>
              <input
                type="text"
                value={profileForm.allergies}
                onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                placeholder="e.g., Peanuts, Penicillin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medications (comma-separated)</label>
              <input
                type="text"
                value={profileForm.medications}
                onChange={(e) => setProfileForm({ ...profileForm, medications: e.target.value })}
                placeholder="e.g., Aspirin, Metformin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Update Profile'}
            </Button>
          </div>
        </Modal>

        {/* Goal Modal */}
        <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Add New Goal">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
              <input
                type="text"
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="e.g., Walk 10,000 steps daily"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target (optional)</label>
              <input
                type="text"
                value={goalForm.target}
                onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                placeholder="e.g., 30 days"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button className="w-full" onClick={handleCreateGoal} disabled={saving || !goalForm.title}>
              {saving ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </Modal>

        {/* Progress Modal */}
        <Modal isOpen={showProgressModal} onClose={() => setShowProgressModal(false)} title="Update Goal Progress">
          <div className="space-y-4">
            {selectedGoal && (
              <>
                <p className="text-gray-600">Goal: <strong>{selectedGoal.title}</strong></p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progressForm.progress}
                    onChange={(e) => setProgressForm({ progress: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button className="w-full" onClick={handleUpdateGoalProgress} disabled={saving}>
                  {saving ? 'Updating...' : 'Update Progress'}
                </Button>
              </>
            )}
          </div>
        </Modal>

        {/* Appointment Modal */}
        <Modal isOpen={showAppointmentModal} onClose={() => setShowAppointmentModal(false)} title="Schedule Appointment">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={appointmentForm.title}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                placeholder="e.g., Regular Checkup"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={appointmentForm.scheduledAt}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={appointmentForm.type}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="checkup">Checkup</option>
                <option value="follow-up">Follow-up</option>
                <option value="preventive">Preventive Care</option>
                <option value="consultation">Consultation</option>
                <option value="blood-test">Blood Test</option>
                <option value="vaccination">Vaccination</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={appointmentForm.description}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={handleCreateAppointment} disabled={saving || !appointmentForm.title || !appointmentForm.scheduledAt}>
              {saving ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
