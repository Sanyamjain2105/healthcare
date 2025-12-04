// src/controllers/patient.controller.js
const Patient = require('../models/patientProfile.model');
const Provider = require('../models/provider.model');

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
 * Sanitizes a patient document for API response.
 * Keeps important fields, but avoids exposing internal DB specifics.
 */
const sanitizePatient = (patientDoc) => {
  if (!patientDoc) return null;
  const p = patientDoc.toObject ? patientDoc.toObject() : patientDoc;
  return {
    id: p._id,
    user: p.user,
    name: p.name,
    age: p.age,
    allergies: p.allergies || [],
    medications: p.medications || [],
    assignedProvider: p.assignedProvider
      ? {
          id: p.assignedProvider._id || p.assignedProvider,
          name: p.assignedProvider.name,
          specialty: p.assignedProvider.specialty
        }
      : null,
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
   * GET /api/patients/me
   * Return the patient's profile.
   */
  getProfile: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId }).populate('assignedProvider', 'name specialty');
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      return res.status(200).json({ patient: sanitizePatient(patient) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * PUT /api/patients/me
   * Update patient profile fields (name, age, allergies, medications).
   * Body: { name?, age?, allergies?, medications? }
   */
  updateProfile: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const update = {};
      // TODO: Add validation for types / lengths
      if (req.body.name !== undefined) update.name = req.body.name;
      if (req.body.age !== undefined) update.age = req.body.age;
      if (req.body.allergies !== undefined) update.allergies = Array.isArray(req.body.allergies) ? req.body.allergies : [req.body.allergies];
      if (req.body.medications !== undefined) update.medications = Array.isArray(req.body.medications) ? req.body.medications : [req.body.medications];

      const patient = await Patient.findOneAndUpdate({ user: userId }, { $set: update }, { new: true }).populate('assignedProvider', 'name specialty');
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      return res.status(200).json({ patient: sanitizePatient(patient) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/patients/dashboard
   * Returns consolidated data:
   *  - goals and progress
   *  - pending reminders (not sent and due in the future)
   *  - preventive care reminders (due in next X days)
   *  - a simple health tip of the day
   */
  getDashboard: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId }).populate('assignedProvider', 'name specialty');
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const now = new Date();

      // Goals
      const goals = (patient.goals || []).map(g => ({
        id: g._id,
        title: g.title,
        target: g.target,
        progress: g.progress,
        lastLoggedAt: g.lastLoggedAt
      }));

      // Upcoming reminders: due in next 30 days
      const upcomingWindowDays = 30;
      const upcomingCutoff = new Date(now.getTime() + upcomingWindowDays * 24 * 60 * 60 * 1000);

      const upcomingReminders = (patient.reminders || [])
        .filter(r => r.dueAt && new Date(r.dueAt) <= upcomingCutoff)
        .map(r => ({ id: r._id, type: r.type, dueAt: r.dueAt, message: r.message, sent: !!r.sent }));

      // Unsent reminders
      const unsentReminders = (patient.reminders || [])
        .filter(r => !r.sent)
        .map(r => ({ id: r._id, type: r.type, dueAt: r.dueAt, message: r.message }));

      // Preventive care due soon (simple heuristic: reminders with type 'preventive' or message contains 'preventive')
      const preventive = (patient.reminders || [])
        .filter(r => r.type && r.type.toLowerCase().includes('preventive') || (r.message && r.message.toLowerCase().includes('preventive')))
        .map(r => ({ id: r._id, dueAt: r.dueAt, message: r.message, sent: !!r.sent }));

      // Health tip: simple static or random selection (could be replaced by service)
      const tips = [
        'Drink at least 8 cups of water daily.',
        'Aim for 7-9 hours of sleep each night.',
        'Try to walk 30 minutes each day.',
        'Include vegetables in most meals.',
        'Take short breaks and stretch hourly.'
      ];
      const tipOfTheDay = tips[Math.floor(Math.random() * tips.length)];

      const dashboard = {
        patient: sanitizePatient(patient),
        goals,
        upcomingReminders,
        unsentReminders,
        preventive,
        tipOfTheDay
      };

      return res.status(200).json(dashboard);
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/patients/goals
   * Create a new goal for the patient.
   * Body: { title: string, target?: string }
   */
  createGoal: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      // Basic validation
      const { title, target } = req.body;
      if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Goal title is required' });

      const newGoal = { title, target: target || '', progress: 0, lastLoggedAt: null };

      const patient = await Patient.findOneAndUpdate(
        { user: userId },
        { $push: { goals: newGoal } },
        { new: true }
      ).populate('assignedProvider', 'name specialty');

      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      // Last pushed goal is the new one
      const addedGoal = patient.goals[patient.goals.length - 1];

      return res.status(201).json({ goal: { id: addedGoal._id, title: addedGoal.title, target: addedGoal.target, progress: addedGoal.progress } });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/patients/goals/:id/log
   * Log progress for a goal.
   * Body: { progressIncrement?: number, progress?: number }
   * If progress is provided, it sets progress; if progressIncrement provided, increments current progress.
   */
  logGoalProgress: async (req, res, next) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const goalId = req.params.id;
      if (!goalId) return res.status(400).json({ error: 'Goal id is required in path' });

      const { progressIncrement, progress } = req.body;

      if (progress === undefined && progressIncrement === undefined) {
        return res.status(400).json({ error: 'Either progress or progressIncrement required' });
      }

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const goal = patient.goals.id(goalId);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      if (progress !== undefined) {
        if (typeof progress !== 'number') return res.status(400).json({ error: 'progress must be a number' });
        goal.progress = progress;
      } else {
        // increment
        if (typeof progressIncrement !== 'number') return res.status(400).json({ error: 'progressIncrement must be a number' });
        goal.progress = (goal.progress || 0) + progressIncrement;
      }

      goal.lastLoggedAt = new Date();

      await patient.save();

      return res.status(200).json({
        goal: {
          id: goal._id,
          title: goal.title,
          target: goal.target,
          progress: goal.progress,
          lastLoggedAt: goal.lastLoggedAt
        }
      });
    } catch (err) {
      return respondError(res, err);
    }
  }
};
