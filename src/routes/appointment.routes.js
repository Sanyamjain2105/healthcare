// src/routes/appointment.routes.js
const Router = require('express').Router;
const router = Router();
const appointmentController = require('../controllers/appointment.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// All appointment routes require authentication
router.use(authMiddleware);

// ============ PATIENT ROUTES ============
// Prefix: /api/appointments/patient

router.get('/patient', requireRole('patient'), appointmentController.getPatientAppointments);
router.get('/patient/:id', requireRole('patient'), appointmentController.getPatientAppointment);
router.post('/patient', requireRole('patient'), appointmentController.createPatientAppointment);
router.put('/patient/:id', requireRole('patient'), appointmentController.updatePatientAppointment);
router.delete('/patient/:id', requireRole('patient'), appointmentController.cancelPatientAppointment);

// ============ PROVIDER ROUTES ============
// Prefix: /api/appointments/provider

router.get('/provider', requireRole('provider'), appointmentController.getProviderAppointments);
router.post('/provider', requireRole('provider'), appointmentController.createProviderAppointment);
router.put('/provider/:id', requireRole('provider'), appointmentController.updateProviderAppointment);

module.exports = router;
