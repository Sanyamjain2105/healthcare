'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useProviderStore, PatientDetail } from '@/stores/provider.store';
import { getGreeting, formatDate, formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { 
    profile, 
    patients, 
    appointments,
    patientWellness,
    fetchProfile, 
    fetchPatients, 
    fetchAppointments,
    fetchPatientWellness,
    updateCompliance,
    updateAppointmentStatus,
    isLoading 
  } = useProviderStore();
  
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [showWellnessPanel, setShowWellnessPanel] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'provider') {
      router.push('/patient/dashboard');
      return;
    }
    
    fetchProfile();
    fetchPatients();
    fetchAppointments();
  }, [isAuthenticated, user, router, fetchProfile, fetchPatients, fetchAppointments]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleComplianceUpdate = async (patientId: string, status: 'met' | 'missed') => {
    await updateCompliance(patientId, status);
  };

  const handleViewWellness = async (patient: PatientDetail) => {
    setSelectedPatient(patient);
    await fetchPatientWellness(patient.id);
    setShowWellnessPanel(true);
  };

  const handleAppointmentStatus = async (appointmentId: string, status: string) => {
    await updateAppointmentStatus(appointmentId, status);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const providerName = profile?.name || user.email.split('@')[0];

  // Calculate compliance stats
  const getComplianceStatus = (patient: PatientDetail) => {
    const activeGoals = patient.goals?.length || 0;
    const metGoals = patient.goals?.filter(g => g.progress >= 100).length || 0;
    const hasRecentActivity = patient.goals?.some(
      g => g.lastLoggedAt && new Date(g.lastLoggedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (activeGoals === 0) return { status: 'no-goals', color: 'gray', label: 'No Goals' };
    if (metGoals === activeGoals) return { status: 'met', color: 'success', label: 'Goals Met' };
    if (!hasRecentActivity) return { status: 'inactive', color: 'danger', label: 'Inactive' };
    return { status: 'in-progress', color: 'warning', label: 'In Progress' };
  };

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
                <p className="text-sm text-gray-500">Provider Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{providerName}</span>
              <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                {profile?.specialty}
              </span>
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
            {getGreeting()}, {providerName}!
          </h2>
          <p className="text-gray-500 mt-1">
            You have {patients.length} patients assigned to you.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patients List */}
            <div className="lg:col-span-2">
              <Card title="Patient Compliance" subtitle="Monitor your patients' health goals">
                <div className="space-y-4">
                  {patients.length > 0 ? (
                    patients.map((patient) => {
                      const compliance = getComplianceStatus(patient);
                      return (
                        <div
                          key={patient.id}
                          className={cn(
                            'p-4 rounded-lg border cursor-pointer transition-all',
                            selectedPatient?.id === patient.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                          )}
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{patient.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">
                                  Age: {patient.age || 'N/A'} • {patient.goals?.length || 0} goals
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span
                                className={cn(
                                  'px-3 py-1 text-xs font-medium rounded-full',
                                  compliance.color === 'success' && 'bg-success-50 text-success-600',
                                  compliance.color === 'warning' && 'bg-warning-50 text-warning-600',
                                  compliance.color === 'danger' && 'bg-danger-50 text-danger-600',
                                  compliance.color === 'gray' && 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {compliance.label}
                              </span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplianceUpdate(patient.id, 'met');
                                  }}
                                  className="p-1 text-success-500 hover:bg-success-50 rounded"
                                  title="Mark as Met"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplianceUpdate(patient.id, 'missed');
                                  }}
                                  className="p-1 text-danger-500 hover:bg-danger-50 rounded"
                                  title="Mark as Missed"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Goals preview */}
                          {patient.goals && patient.goals.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {patient.goals.slice(0, 2).map((goal) => (
                                <div key={goal.id}>
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{goal.title}</span>
                                    <span>{goal.progress}%</span>
                                  </div>
                                  <ProgressBar
                                    value={goal.progress}
                                    size="sm"
                                    color={goal.progress >= 100 ? 'success' : 'primary'}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-8">No patients assigned yet.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Selected Patient Detail */}
              {selectedPatient && (
                <Card title="Patient Details">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold">{selectedPatient.name}</h4>
                        <p className="text-sm text-gray-500">Age: {selectedPatient.age}</p>
                      </div>
                      <Button size="sm" onClick={() => handleViewWellness(selectedPatient)}>
                        📊 View Wellness
                      </Button>
                    </div>
                    
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Allergies</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPatient.allergies.map((allergy, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-danger-50 text-danger-600 rounded">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedPatient.medications && selectedPatient.medications.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Medications</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPatient.medications.map((med, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded">
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPatient.goals && selectedPatient.goals.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Goals</p>
                        <div className="space-y-2">
                          {selectedPatient.goals.map((goal) => (
                            <div key={goal.id} className="p-2 bg-gray-50 rounded">
                              <div className="flex justify-between text-sm">
                                <span>{goal.title}</span>
                                <span className="text-gray-500">{goal.progress}%</span>
                              </div>
                              <ProgressBar value={goal.progress} size="sm" className="mt-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wellness Summary */}
                    {showWellnessPanel && patientWellness && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Wellness (Last 7 Days)</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-blue-50 rounded text-center">
                            <p className="text-lg font-bold text-blue-600">{patientWellness.summary.averageSteps}</p>
                            <p className="text-xs text-gray-500">Avg Steps</p>
                          </div>
                          <div className="p-2 bg-green-50 rounded text-center">
                            <p className="text-lg font-bold text-green-600">{patientWellness.summary.averageSleep}h</p>
                            <p className="text-xs text-gray-500">Avg Sleep</p>
                          </div>
                          <div className="p-2 bg-cyan-50 rounded text-center">
                            <p className="text-lg font-bold text-cyan-600">{patientWellness.summary.averageWater}</p>
                            <p className="text-xs text-gray-500">Avg Water</p>
                          </div>
                          <div className="p-2 bg-orange-50 rounded text-center">
                            <p className="text-lg font-bold text-orange-600">{patientWellness.summary.averageActiveMinutes}m</p>
                            <p className="text-xs text-gray-500">Avg Active</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                          {patientWellness.summary.daysLogged} days logged
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Upcoming Appointments */}
              <Card title="Upcoming Appointments">
                {appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{apt.title}</p>
                            <p className="text-xs text-gray-500">{apt.patient?.name}</p>
                          </div>
                          <span className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            apt.status === 'confirmed' ? 'bg-success-50 text-success-600' : 
                            apt.status === 'completed' ? 'bg-gray-200 text-gray-600' :
                            'bg-warning-50 text-warning-600'
                          )}>
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDateTime(apt.scheduledAt)}
                        </p>
                        {apt.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAppointmentStatus(apt.id, 'confirmed')}
                              className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded hover:bg-success-200"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleAppointmentStatus(apt.id, 'cancelled')}
                              className="text-xs bg-danger-100 text-danger-700 px-2 py-1 rounded hover:bg-danger-200"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {apt.status === 'confirmed' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAppointmentStatus(apt.id, 'completed')}
                              className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200"
                            >
                              Mark Complete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
                )}
              </Card>

              {/* Quick Stats */}
              <Card title="Overview">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-primary-50 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600">{patients.length}</p>
                    <p className="text-xs text-gray-500">Total Patients</p>
                  </div>
                  <div className="text-center p-3 bg-success-50 rounded-lg">
                    <p className="text-2xl font-bold text-success-600">
                      {patients.filter(p => getComplianceStatus(p).status === 'met').length}
                    </p>
                    <p className="text-xs text-gray-500">Goals Met</p>
                  </div>
                  <div className="text-center p-3 bg-warning-50 rounded-lg">
                    <p className="text-2xl font-bold text-warning-600">
                      {patients.filter(p => getComplianceStatus(p).status === 'in-progress').length}
                    </p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-danger-50 rounded-lg">
                    <p className="text-2xl font-bold text-danger-600">
                      {patients.filter(p => getComplianceStatus(p).status === 'inactive').length}
                    </p>
                    <p className="text-xs text-gray-500">Need Attention</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
