// src/controllers/provider.controller.js
const Provider = require('../models/provider.model');
const Patient = require('../models/patientProfile.model');

/**
 * Helper to extract user id from req.user (handles different token payload shapes)
 */
const userIdFromReq = (req) => {
  if (!req || !req.user) return null;
  return req.user.sub || req.user._id || req.user.id || null;
};

const respondError = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};

/**
 * Sanitizes patient doc for provider listing/details
 */
const sanitizePatientForProvider = (pDoc) => {
  if (!pDoc) return null;
  const p = pDoc.toObject ? pDoc.toObject() : pDoc;
  return {
    id: p._id,
    name: p.name,
    age: p.age,
    allergies: p.allergies || [],
    medications: p.medications || [],
    assignedProvider: p.assignedProvider ? {
      id: p.assignedProvider._id || p.assignedProvider,
      name: p.assignedProvider.name,
      specialty: p.assignedProvider.specialty
    } : null,
    goals: (p.goals || []).map(g => ({
      id: g._id,
      title: g.title,
      target: g.target,
      progress: g.progress,
      lastLoggedAt: g.lastLoggedAt
    })),
    reminders: (p.reminders || []).map(r => ({
      id: r._id,
      type: r.type,
      dueAt: r.dueAt,
      message: r.message,
      sent: !!r.sent
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
};

module.exports = {
  /**
   * GET /api/providers/me
   * Return the provider's profile (basic).
   */
  getProfile: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const provider = await Provider.findOne({ user: userId }).populate('patients', 'name age');
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      // Build response
      const resp = {
        id: provider._id,
        user: provider.user,
        name: provider.name,
        specialty: provider.specialty,
        patientCount: (provider.patients || []).length,
        patients: (provider.patients || []).map(p => ({ id: p._id, name: p.name, age: p.age }))
      };

      return res.status(200).json({ provider: resp });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/providers/patients
   * List assigned patients for the authenticated provider.
   */
  listAssignedPatients: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const provider = await Provider.findOne({ user: userId }).populate({
        path: 'patients',
        populate: { path: 'assignedProvider', select: 'name specialty' }
      });

      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      const patients = (provider.patients || []).map(p => sanitizePatientForProvider(p));

      return res.status(200).json({ patients });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/providers/patients/:id
   * Provider views a specific patient's full details.
   */
  viewPatientDetails: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patientId = req.params.id;
      if (!patientId) return res.status(400).json({ error: 'Patient id required' });

      // Verify provider exists
      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      // Optionally: ensure this patient is assigned to the provider
      const isAssigned = (provider.patients || []).some(pid => String(pid) === String(patientId));
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this patient' });
      }

      const patient = await Patient.findById(patientId).populate('assignedProvider', 'name specialty');
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      return res.status(200).json({ patient: sanitizePatientForProvider(patient) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/providers/patients/:id/compliance
   * Record compliance/update for a patient.
   * Body: { goalId?: string, status: 'met'|'missed'|'in-progress', note?: string }
   *
   * NOTE: to avoid schema changes this implementation stores a `compliance` action
   * as a reminder entry (type='compliance') so actions are auditable and visible.
   */
  updateCompliance: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patientId = req.params.id;
      if (!patientId) return res.status(400).json({ error: 'Patient id required' });

      const { goalId, status, note } = req.body;
      if (!status || (typeof status !== 'string')) {
        return res.status(400).json({ error: 'status (string) is required' });
      }

      // Verify provider
      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      // Ensure provider is assigned to this patient
      const isAssigned = (provider.patients || []).some(pid => String(pid) === String(patientId));
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this patient' });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      // Create a compliance reminder object and push to patient's reminders
      const complianceEntry = {
        type: 'compliance',
        dueAt: new Date(),
        message: JSON.stringify({
          goalId: goalId || null,
          status,
          note: note || '',
          providerId: provider._id.toString(),
          providerName: provider.name || null,
          timestamp: new Date().toISOString()
        }),
        sent: false
      };

      patient.reminders.push(complianceEntry);
      await patient.save();

      return res.status(201).json({
        message: 'Compliance recorded',
        compliance: {
          type: 'compliance',
          goalId: goalId || null,
          status,
          note: note || '',
          provider: { id: provider._id, name: provider.name },
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/providers/patients/:id/wellness
   * Get a patient's wellness history (for provider view)
   */
  getPatientWellness: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patientId = req.params.id;
      if (!patientId) return res.status(400).json({ error: 'Patient id required' });

      // Verify provider
      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      // Ensure provider is assigned to this patient
      const isAssigned = (provider.patients || []).some(pid => String(pid) === String(patientId));
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this patient' });
      }

      // Get patient's wellness logs (last 7 days)
      const WellnessLog = require('../models/wellnessLog.model');
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const logs = await WellnessLog.find({
        patient: patientId,
        date: { $gte: startDate }
      }).sort({ date: -1 });

      // Calculate summary
      const summary = {
        daysLogged: logs.length,
        averageSteps: logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.steps || 0), 0) / logs.length) : 0,
        averageSleep: logs.length > 0 ? Math.round((logs.reduce((acc, l) => acc + (l.sleepHours || 0), 0) / logs.length) * 10) / 10 : 0,
        averageWater: logs.length > 0 ? Math.round((logs.reduce((acc, l) => acc + (l.waterIntake || 0), 0) / logs.length) * 10) / 10 : 0,
        averageActiveMinutes: logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.activeMinutes || 0), 0) / logs.length) : 0
      };

      return res.status(200).json({
        patient: { id: patient._id, name: patient.name },
        summary,
        logs: logs.map(l => ({
          id: l._id,
          date: l.date,
          steps: l.steps,
          sleepHours: l.sleepHours,
          waterIntake: l.waterIntake,
          activeMinutes: l.activeMinutes,
          notes: l.notes
        }))
      });
    } catch (err) {
      return respondError(res, err);
    }
  }
};
