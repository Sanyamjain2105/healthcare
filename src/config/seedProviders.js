// src/config/seedProviders.js
/*
  Simple seeder to create a fixed set of providers.
  It creates User (role: provider) + Provider profile.
*/
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user.model');
const Provider = require('../models/provider.model');
const { hashPassword } = require('../utils/password.util');

const providersToSeed = [
  { email: 'doc1@example.com', name: 'Dr. Alice', specialty: 'Family Medicine' },
  { email: 'doc2@example.com', name: 'Dr. Bob', specialty: 'Preventive Care' }
];

module.exports = async function seedProviders() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/health-portal';
  await mongoose.connect(mongoUri, {});
  console.log('Connected to Mongo for seeding providers');

  for (const p of providersToSeed) {
    const existing = await User.findOne({ email: p.email });
    if (existing) {
      console.log(`Provider user ${p.email} already exists, skipping`);
      continue;
    }
    const pw = await hashPassword('changeme123'); // default password; change in prod
    const user = await User.create({ email: p.email, passwordHash: pw, role: 'provider' });
    await Provider.create({ user: user._id, name: p.name, specialty: p.specialty, patients: [] });
    console.log(`Seeded provider ${p.email}`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete');
};
