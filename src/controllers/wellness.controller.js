// src/controllers/wellness.controller.js
const WellnessLog = require('../models/wellnessLog.model');
const Patient = require('../models/patientProfile.model');

/**
 * Helper to extract user id from req.user
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
 * Sanitize wellness log for API response
 */
const sanitizeLog = (log) => {
  if (!log) return null;
  const l = log.toObject ? log.toObject() : log;
  return {
    id: l._id,
    date: l.date,
    steps: l.steps,
    stepsGoal: l.stepsGoal,
    stepsProgress: l.stepsProgress,
    activeMinutes: l.activeMinutes,
    activeMinutesGoal: l.activeMinutesGoal,
    activeProgress: l.activeProgress,
    sleepHours: l.sleepHours,
    sleepGoal: l.sleepGoal,
    sleepProgress: l.sleepProgress,
    waterIntake: l.waterIntake,
    waterGoal: l.waterGoal,
    waterProgress: l.waterProgress,
    notes: l.notes,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt
  };
};

module.exports = {
  /**
   * GET /api/patients/wellness/today
   * Get or create today's wellness log
   */
  getToday: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const log = await WellnessLog.getOrCreateToday(patient._id);
      return res.status(200).json({ wellness: sanitizeLog(log) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * PUT /api/patients/wellness/today
   * Update today's wellness log
   * Body: { steps?, activeMinutes?, sleepHours?, waterIntake?, notes? }
   */
  updateToday: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const log = await WellnessLog.getOrCreateToday(patient._id);

      // Update fields if provided
      const allowedFields = ['steps', 'activeMinutes', 'sleepHours', 'waterIntake', 'notes'];
      const goalFields = ['stepsGoal', 'activeMinutesGoal', 'sleepGoal', 'waterGoal'];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          log[field] = req.body[field];
        }
      }
      
      // Allow updating goals too
      for (const field of goalFields) {
        if (req.body[field] !== undefined) {
          log[field] = req.body[field];
        }
      }

      await log.save();
      return res.status(200).json({ wellness: sanitizeLog(log) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/patients/wellness/log
   * Increment wellness metrics (add to existing values)
   * Body: { steps?, activeMinutes?, waterIntake? }
   */
  logActivity: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const log = await WellnessLog.getOrCreateToday(patient._id);

      // Increment fields
      if (typeof req.body.steps === 'number') {
        log.steps = (log.steps || 0) + req.body.steps;
      }
      if (typeof req.body.activeMinutes === 'number') {
        log.activeMinutes = (log.activeMinutes || 0) + req.body.activeMinutes;
      }
      if (typeof req.body.waterIntake === 'number') {
        log.waterIntake = (log.waterIntake || 0) + req.body.waterIntake;
      }

      await log.save();
      return res.status(200).json({ wellness: sanitizeLog(log) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/patients/wellness/history
   * Get wellness history for date range
   * Query: ?days=7 (default 7, max 90)
   */
  getHistory: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 7));
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const logs = await WellnessLog.find({
        patient: patient._id,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 });

      // Calculate averages
      const totals = logs.reduce((acc, log) => {
        acc.steps += log.steps || 0;
        acc.activeMinutes += log.activeMinutes || 0;
        acc.sleepHours += log.sleepHours || 0;
        acc.waterIntake += log.waterIntake || 0;
        return acc;
      }, { steps: 0, activeMinutes: 0, sleepHours: 0, waterIntake: 0 });

      const count = logs.length || 1;
      const averages = {
        steps: Math.round(totals.steps / count),
        activeMinutes: Math.round(totals.activeMinutes / count),
        sleepHours: Math.round((totals.sleepHours / count) * 10) / 10,
        waterIntake: Math.round((totals.waterIntake / count) * 10) / 10
      };

      return res.status(200).json({
        history: logs.map(sanitizeLog),
        averages,
        period: { days, startDate, endDate }
      });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/patients/wellness/summary
   * Get wellness summary with progress towards goals
   */
  getSummary: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      // Get today's log
      const today = await WellnessLog.getOrCreateToday(patient._id);

      // Get last 7 days for trend
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const weekLogs = await WellnessLog.find({
        patient: patient._id,
        date: { $gte: weekAgo }
      }).sort({ date: -1 });

      // Calculate weekly stats
      const weeklyStats = weekLogs.reduce((acc, log) => {
        acc.totalSteps += log.steps || 0;
        acc.totalActiveMinutes += log.activeMinutes || 0;
        acc.totalSleepHours += log.sleepHours || 0;
        acc.daysLogged++;
        if (log.steps >= log.stepsGoal) acc.stepsGoalMetDays++;
        if (log.sleepHours >= log.sleepGoal) acc.sleepGoalMetDays++;
        return acc;
      }, { 
        totalSteps: 0, 
        totalActiveMinutes: 0, 
        totalSleepHours: 0, 
        daysLogged: 0,
        stepsGoalMetDays: 0,
        sleepGoalMetDays: 0
      });

      return res.status(200).json({
        today: sanitizeLog(today),
        weekly: {
          averageSteps: Math.round(weeklyStats.totalSteps / (weeklyStats.daysLogged || 1)),
          averageActiveMinutes: Math.round(weeklyStats.totalActiveMinutes / (weeklyStats.daysLogged || 1)),
          averageSleepHours: Math.round((weeklyStats.totalSleepHours / (weeklyStats.daysLogged || 1)) * 10) / 10,
          daysLogged: weeklyStats.daysLogged,
          stepsGoalMetDays: weeklyStats.stepsGoalMetDays,
          sleepGoalMetDays: weeklyStats.sleepGoalMetDays
        }
      });
    } catch (err) {
      return respondError(res, err);
    }
  }
};
