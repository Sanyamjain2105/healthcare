// src/controllers/appointment.controller.js
const Appointment = require('../models/appointment.model');
const Patient = require('../models/patientProfile.model');
const Provider = require('../models/provider.model');

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
 * Sanitize appointment for API response
 */
const sanitizeAppointment = (apt) => {
  if (!apt) return null;
  const a = apt.toObject ? apt.toObject() : apt;
  return {
    id: a._id,
    scheduledAt: a.scheduledAt,
    duration: a.duration,
    type: a.type,
    status: a.status,
    title: a.title,
    description: a.description,
    location: a.location,
    isUpcoming: a.isUpcoming,
    patient: a.patient ? {
      id: a.patient._id || a.patient,
      name: a.patient.name
    } : null,
    provider: a.provider ? {
      id: a.provider._id || a.provider,
      name: a.provider.name,
      specialty: a.provider.specialty
    } : null,
    notes: a.notes,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  };
};

module.exports = {
  // ============ PATIENT ENDPOINTS ============

  /**
   * GET /api/patients/appointments
   * Get patient's appointments
   * Query: ?status=scheduled&upcoming=true&days=30
   */
  getPatientAppointments: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const query = { patient: patient._id };

      // Filter by status
      if (req.query.status) {
        query.status = req.query.status;
      }

      // Filter upcoming only
      if (req.query.upcoming === 'true') {
        const days = parseInt(req.query.days) || 30;
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        query.scheduledAt = { $gte: now, $lte: future };
        query.status = { $in: ['scheduled', 'confirmed'] };
      }

      const appointments = await Appointment.find(query)
        .populate('provider', 'name specialty')
        .sort({ scheduledAt: 1 });

      return res.status(200).json({ 
        appointments: appointments.map(sanitizeAppointment) 
      });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * GET /api/patients/appointments/:id
   * Get single appointment details
   */
  getPatientAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const appointment = await Appointment.findOne({
        _id: req.params.id,
        patient: patient._id
      }).populate('provider', 'name specialty');

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      return res.status(200).json({ appointment: sanitizeAppointment(appointment) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/patients/appointments
   * Request a new appointment
   * Body: { scheduledAt, type?, title, description?, duration? }
   */
  createPatientAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId }).populate('assignedProvider');
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      if (!patient.assignedProvider) {
        return res.status(400).json({ error: 'No provider assigned. Please contact support.' });
      }

      const { scheduledAt, type, title, description, duration, location } = req.body;

      if (!scheduledAt || !title) {
        return res.status(400).json({ error: 'scheduledAt and title are required' });
      }

      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Appointment must be in the future' });
      }

      const appointment = await Appointment.create({
        patient: patient._id,
        provider: patient.assignedProvider._id,
        scheduledAt: scheduledDate,
        type: type || 'checkup',
        title,
        description: description || '',
        duration: duration || 30,
        location: location || '',
        status: 'scheduled'
      });

      const populated = await Appointment.findById(appointment._id)
        .populate('provider', 'name specialty');

      return res.status(201).json({ appointment: sanitizeAppointment(populated) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * PUT /api/patients/appointments/:id
   * Update appointment (patient can add notes, request reschedule)
   * Body: { notes?, requestReschedule?: boolean }
   */
  updatePatientAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const appointment = await Appointment.findOne({
        _id: req.params.id,
        patient: patient._id
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Patient can only update notes
      if (req.body.notes !== undefined) {
        appointment.notes = {
          ...appointment.notes,
          patient: req.body.notes
        };
      }

      await appointment.save();

      const populated = await Appointment.findById(appointment._id)
        .populate('provider', 'name specialty');

      return res.status(200).json({ appointment: sanitizeAppointment(populated) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * DELETE /api/patients/appointments/:id
   * Cancel an appointment
   * Body: { reason? }
   */
  cancelPatientAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const patient = await Patient.findOne({ user: userId });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const appointment = await Appointment.findOne({
        _id: req.params.id,
        patient: patient._id,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found or already cancelled/completed' });
      }

      appointment.status = 'cancelled';
      appointment.cancelReason = req.body.reason || 'Cancelled by patient';
      await appointment.save();

      return res.status(200).json({ 
        message: 'Appointment cancelled',
        appointment: sanitizeAppointment(appointment)
      });
    } catch (err) {
      return respondError(res, err);
    }
  },

  // ============ PROVIDER ENDPOINTS ============

  /**
   * GET /api/providers/appointments
   * Get provider's appointments
   * Query: ?date=2024-01-15&status=scheduled
   */
  getProviderAppointments: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      const query = { provider: provider._id };

      // Filter by date
      if (req.query.date) {
        const date = new Date(req.query.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        query.scheduledAt = { $gte: date, $lt: nextDay };
      }

      // Filter by status
      if (req.query.status) {
        query.status = req.query.status;
      }

      // Filter upcoming
      if (req.query.upcoming === 'true') {
        const days = parseInt(req.query.days) || 7;
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        query.scheduledAt = { $gte: now, $lte: future };
      }

      const appointments = await Appointment.find(query)
        .populate('patient', 'name age')
        .sort({ scheduledAt: 1 });

      return res.status(200).json({ 
        appointments: appointments.map(sanitizeAppointment) 
      });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * PUT /api/providers/appointments/:id
   * Update appointment (provider can confirm, add notes, mark complete)
   * Body: { status?, notes?, location? }
   */
  updateProviderAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      const appointment = await Appointment.findOne({
        _id: req.params.id,
        provider: provider._id
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Provider can update status
      if (req.body.status) {
        const validStatuses = ['confirmed', 'completed', 'cancelled', 'no-show'];
        if (validStatuses.includes(req.body.status)) {
          appointment.status = req.body.status;
          if (req.body.status === 'cancelled' && req.body.reason) {
            appointment.cancelReason = req.body.reason;
          }
        }
      }

      // Provider can add notes
      if (req.body.notes !== undefined) {
        appointment.notes = {
          ...appointment.notes,
          provider: req.body.notes
        };
      }

      // Update location
      if (req.body.location !== undefined) {
        appointment.location = req.body.location;
      }

      await appointment.save();

      const populated = await Appointment.findById(appointment._id)
        .populate('patient', 'name age');

      return res.status(200).json({ appointment: sanitizeAppointment(populated) });
    } catch (err) {
      return respondError(res, err);
    }
  },

  /**
   * POST /api/providers/appointments
   * Provider creates appointment for a patient
   * Body: { patientId, scheduledAt, type?, title, description?, duration?, location? }
   */
  createProviderAppointment: async (req, res) => {
    try {
      const userId = userIdFromReq(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const provider = await Provider.findOne({ user: userId });
      if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

      const { patientId, scheduledAt, type, title, description, duration, location } = req.body;

      if (!patientId || !scheduledAt || !title) {
        return res.status(400).json({ error: 'patientId, scheduledAt, and title are required' });
      }

      // Verify patient is assigned to this provider
      const isAssigned = (provider.patients || []).some(p => String(p) === String(patientId));
      if (!isAssigned) {
        return res.status(403).json({ error: 'Patient is not assigned to you' });
      }

      const appointment = await Appointment.create({
        patient: patientId,
        provider: provider._id,
        scheduledAt: new Date(scheduledAt),
        type: type || 'checkup',
        title,
        description: description || '',
        duration: duration || 30,
        location: location || '',
        status: 'confirmed' // Provider-created appointments are auto-confirmed
      });

      const populated = await Appointment.findById(appointment._id)
        .populate('patient', 'name age');

      return res.status(201).json({ appointment: sanitizeAppointment(populated) });
    } catch (err) {
      return respondError(res, err);
    }
  }
};
