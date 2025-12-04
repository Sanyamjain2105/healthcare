// src/models/provider.model.js
const { Schema, model } = require('mongoose');

const ProviderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  specialty: String,
  patients: [{ type: Schema.Types.ObjectId, ref: 'PatientProfile' }]
}, { timestamps: true });

module.exports = model('Provider', ProviderSchema);
