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
const wellnessRoutes = require('./routes/wellness.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const cronJob = require('./cron/scheduler');
const { errorHandler } = require('./middlewares/error.middleware');
const { auditMiddleware } = require('./middlewares/audit.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size for security

// Rate limiting (applied to all API routes)
app.use('/api', apiLimiter);

// Audit logging (applied to all API routes)
app.use('/api', auditMiddleware);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patients/wellness', wellnessRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ 
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '0.1.0'
}));

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
