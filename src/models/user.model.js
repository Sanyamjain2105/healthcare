// src/models/user.model.js
const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'provider'], required: true },
  refreshTokens: [{ type: String }], // store active refresh tokens (rotate on refresh)
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('User', UserSchema);
