// src/models/appointment.model.js
const { Schema, model } = require('mongoose');

/**
 * Appointment - Stores scheduled appointments between patients and providers
 */
const AppointmentSchema = new Schema({
  patient: { 
    type: Schema.Types.ObjectId, 
    ref: 'PatientProfile', 
    required: true,
    index: true 
  },
  provider: { 
    type: Schema.Types.ObjectId, 
    ref: 'Provider', 
    required: true,
    index: true 
  },
  scheduledAt: { 
    type: Date, 
    required: true,
    index: true 
  },
  duration: { 
    type: Number, 
    default: 30, // minutes
    min: 15,
    max: 180 
  },
  type: { 
    type: String, 
    enum: [
      'checkup',
      'follow-up', 
      'preventive',
      'blood-test',
      'vaccination',
      'consultation',
      'physical-exam',
      'specialist-referral',
      'other'
    ],
    default: 'checkup' 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true 
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 200 
  },
  description: { 
    type: String, 
    maxlength: 1000 
  },
  location: { 
    type: String,
    maxlength: 200 
  },
  reminderSent: { 
    type: Boolean, 
    default: false 
  },
  notes: {
    patient: { type: String, maxlength: 500 },
    provider: { type: String, maxlength: 500 }
  },
  cancelReason: { 
    type: String, 
    maxlength: 500 
  }
}, { 
  timestamps: true 
});

// Compound indexes for efficient queries
AppointmentSchema.index({ patient: 1, scheduledAt: -1 });
AppointmentSchema.index({ provider: 1, scheduledAt: -1 });
AppointmentSchema.index({ status: 1, scheduledAt: 1 });

// Virtual to check if appointment is upcoming
AppointmentSchema.virtual('isUpcoming').get(function() {
  return this.scheduledAt > new Date() && this.status === 'scheduled';
});

// Virtual to check if appointment is past due
AppointmentSchema.virtual('isPastDue').get(function() {
  return this.scheduledAt < new Date() && this.status === 'scheduled';
});

// Static method to get upcoming appointments for a patient
AppointmentSchema.statics.getUpcoming = function(patientId, days = 30) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return this.find({
    patient: patientId,
    scheduledAt: { $gte: now, $lte: future },
    status: { $in: ['scheduled', 'confirmed'] }
  })
  .populate('provider', 'name specialty')
  .sort({ scheduledAt: 1 });
};

// Static method to get provider's schedule for a date range
AppointmentSchema.statics.getProviderSchedule = function(providerId, startDate, endDate) {
  return this.find({
    provider: providerId,
    scheduledAt: { $gte: startDate, $lte: endDate },
    status: { $nin: ['cancelled'] }
  })
  .populate('patient', 'name age')
  .sort({ scheduledAt: 1 });
};

// Enable virtuals in JSON output
AppointmentSchema.set('toJSON', { virtuals: true });
AppointmentSchema.set('toObject', { virtuals: true });

module.exports = model('Appointment', AppointmentSchema);
