// src/routes/patient.routes.js
const Router = require('express').Router;
const router = Router();
const patientController = require('../controllers/patient.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// patient profile
router.get('/me', requireRole('patient'), patientController.getProfile);
router.put('/me', requireRole('patient'), patientController.updateProfile);

// dashboard & goals
router.get('/dashboard', requireRole('patient'), patientController.getDashboard);
router.post('/goals', requireRole('patient'), patientController.createGoal);
router.post('/goals/:id/log', requireRole('patient'), patientController.logGoalProgress);

module.exports = router;
