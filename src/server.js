// src/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const providerRoutes = require('./routes/provider.routes');
const cronJob = require('./cron/scheduler');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/providers', providerRoutes);

// basic health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

const start = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/health-portal';
  await mongoose.connect(mongoUri, {});
  // console.log('Connected to MongoDB' + mongoUri);

  // start cron jobs
  cronJob.startAll();

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
};

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
