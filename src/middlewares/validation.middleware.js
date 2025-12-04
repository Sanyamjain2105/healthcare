// src/middlewares/validation.middleware.js
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Auth validation rules
 */
const authValidation = {
  register: [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 254 }).withMessage('Email too long'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 150 }).withMessage('Age must be 0-150'),
    body('consent')
      .isBoolean().withMessage('Consent must be boolean')
      .equals('true').withMessage('You must accept the terms and privacy policy'),
    validate
  ],
  login: [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
    validate
  ],
  refresh: [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required'),
    validate
  ]
};

/**
 * Patient validation rules
 */
const patientValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 150 }).withMessage('Age must be 0-150'),
    body('allergies')
      .optional()
      .isArray().withMessage('Allergies must be an array'),
    body('medications')
      .optional()
      .isArray().withMessage('Medications must be an array'),
    validate
  ],
  createGoal: [
    body('title')
      .trim()
      .notEmpty().withMessage('Goal title is required')
      .isLength({ max: 200 }).withMessage('Title too long'),
    body('target')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Target too long'),
    validate
  ],
  logProgress: [
    param('id')
      .isMongoId().withMessage('Invalid goal ID'),
    body('progress')
      .optional()
      .isNumeric().withMessage('Progress must be a number'),
    body('progressIncrement')
      .optional()
      .isNumeric().withMessage('Progress increment must be a number'),
    validate
  ]
};

/**
 * Wellness validation rules
 */
const wellnessValidation = {
  update: [
    body('steps')
      .optional()
      .isInt({ min: 0, max: 100000 }).withMessage('Steps must be 0-100,000'),
    body('activeMinutes')
      .optional()
      .isInt({ min: 0, max: 1440 }).withMessage('Active minutes must be 0-1440'),
    body('sleepHours')
      .optional()
      .isFloat({ min: 0, max: 24 }).withMessage('Sleep hours must be 0-24'),
    body('waterIntake')
      .optional()
      .isInt({ min: 0, max: 50 }).withMessage('Water intake must be 0-50 cups'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes too long'),
    validate
  ],
  log: [
    body('steps')
      .optional()
      .isInt({ min: 0, max: 50000 }).withMessage('Steps must be 0-50,000'),
    body('activeMinutes')
      .optional()
      .isInt({ min: 0, max: 480 }).withMessage('Active minutes must be 0-480'),
    body('waterIntake')
      .optional()
      .isInt({ min: 0, max: 10 }).withMessage('Water intake must be 0-10 cups'),
    validate
  ],
  history: [
    query('days')
      .optional()
      .isInt({ min: 1, max: 90 }).withMessage('Days must be 1-90'),
    validate
  ]
};

/**
 * Appointment validation rules
 */
const appointmentValidation = {
  create: [
    body('scheduledAt')
      .notEmpty().withMessage('Scheduled date is required')
      .isISO8601().withMessage('Invalid date format'),
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title too long'),
    body('type')
      .optional()
      .isIn(['checkup', 'follow-up', 'preventive', 'blood-test', 'vaccination', 'consultation', 'physical-exam', 'specialist-referral', 'other'])
      .withMessage('Invalid appointment type'),
    body('duration')
      .optional()
      .isInt({ min: 15, max: 180 }).withMessage('Duration must be 15-180 minutes'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description too long'),
    validate
  ],
  providerCreate: [
    body('patientId')
      .isMongoId().withMessage('Valid patient ID is required'),
    body('scheduledAt')
      .notEmpty().withMessage('Scheduled date is required')
      .isISO8601().withMessage('Invalid date format'),
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title too long'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Invalid appointment ID'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes too long'),
    validate
  ],
  providerUpdate: [
    param('id')
      .isMongoId().withMessage('Invalid appointment ID'),
    body('status')
      .optional()
      .isIn(['confirmed', 'completed', 'cancelled', 'no-show'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes too long'),
    validate
  ],
  cancel: [
    param('id')
      .isMongoId().withMessage('Invalid appointment ID'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Reason too long'),
    validate
  ]
};

/**
 * Provider validation rules
 */
const providerValidation = {
  compliance: [
    param('id')
      .isMongoId().withMessage('Invalid patient ID'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['met', 'missed', 'in-progress'])
      .withMessage('Status must be met, missed, or in-progress'),
    body('goalId')
      .optional()
      .isMongoId().withMessage('Invalid goal ID'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Note too long'),
    validate
  ]
};

module.exports = {
  validate,
  authValidation,
  patientValidation,
  wellnessValidation,
  appointmentValidation,
  providerValidation
};
