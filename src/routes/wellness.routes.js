// src/routes/wellness.routes.js
const Router = require('express').Router;
const router = Router();
const wellnessController = require('../controllers/wellness.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// All wellness routes require authentication as patient
router.use(authMiddleware);
router.use(requireRole('patient'));

// Today's wellness
router.get('/today', wellnessController.getToday);
router.put('/today', wellnessController.updateToday);

// Log activity (increment values)
router.post('/log', wellnessController.logActivity);

// History and summary
router.get('/history', wellnessController.getHistory);
router.get('/summary', wellnessController.getSummary);

module.exports = router;
