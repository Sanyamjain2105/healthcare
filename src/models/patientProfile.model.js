// src/models/patientProfile.model.js
const { Schema, model } = require('mongoose');

const GoalSchema = new Schema({
  title: String,
  target: String,
  progress: { type: Number, default: 0 },
  lastLoggedAt: Date
}, { _id: true });

const ReminderSchema = new Schema({
  type: String,
  dueAt: Date,
  message: String,
  sent: { type: Boolean, default: false }
}, { _id: true });

const PatientProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  age: Number,
  allergies: [String],
  medications: [String],
  assignedProvider: { type: Schema.Types.ObjectId, ref: 'Provider' },
  goals: [GoalSchema],
  reminders: [ReminderSchema]
}, { timestamps: true });

module.exports = model('PatientProfile', PatientProfileSchema);
