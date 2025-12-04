// src/models/wellnessLog.model.js
const { Schema, model } = require('mongoose');

/**
 * WellnessLog - Stores daily wellness tracking data for patients
 * Tracks: steps, active minutes, sleep hours, water intake
 */
const WellnessLogSchema = new Schema({
  patient: { 
    type: Schema.Types.ObjectId, 
    ref: 'PatientProfile', 
    required: true,
    index: true 
  },
  date: { 
    type: Date, 
    required: true,
    index: true 
  },
  steps: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  stepsGoal: { 
    type: Number, 
    default: 10000 
  },
  activeMinutes: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  activeMinutesGoal: { 
    type: Number, 
    default: 30 
  },
  sleepHours: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 24 
  },
  sleepGoal: { 
    type: Number, 
    default: 8 
  },
  waterIntake: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  waterGoal: { 
    type: Number, 
    default: 8 // cups
  },
  notes: { 
    type: String, 
    maxlength: 500 
  }
}, { 
  timestamps: true 
});

// Compound index for efficient date-range queries per patient
WellnessLogSchema.index({ patient: 1, date: -1 });

// Static method to get or create today's log
WellnessLogSchema.statics.getOrCreateToday = async function(patientId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let log = await this.findOne({ 
    patient: patientId, 
    date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
  });
  
  if (!log) {
    log = await this.create({ patient: patientId, date: today });
  }
  
  return log;
};

// Virtual for steps progress percentage
WellnessLogSchema.virtual('stepsProgress').get(function() {
  return Math.min(100, Math.round((this.steps / this.stepsGoal) * 100));
});

// Virtual for active minutes progress percentage
WellnessLogSchema.virtual('activeProgress').get(function() {
  return Math.min(100, Math.round((this.activeMinutes / this.activeMinutesGoal) * 100));
});

// Virtual for sleep progress percentage
WellnessLogSchema.virtual('sleepProgress').get(function() {
  return Math.min(100, Math.round((this.sleepHours / this.sleepGoal) * 100));
});

// Virtual for water progress percentage
WellnessLogSchema.virtual('waterProgress').get(function() {
  return Math.min(100, Math.round((this.waterIntake / this.waterGoal) * 100));
});

// Enable virtuals in JSON output
WellnessLogSchema.set('toJSON', { virtuals: true });
WellnessLogSchema.set('toObject', { virtuals: true });

module.exports = model('WellnessLog', WellnessLogSchema);
