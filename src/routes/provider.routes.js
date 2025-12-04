// src/routes/provider.routes.js
const Router = require('express').Router;
const router = Router();
const providerController = require('../controllers/provider.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/me', requireRole('provider'), providerController.getProfile);
router.get('/patients', requireRole('provider'), providerController.listAssignedPatients);
router.get('/patients/:id', requireRole('provider'), providerController.viewPatientDetails);
router.get('/patients/:id/wellness', requireRole('provider'), providerController.getPatientWellness);
router.post('/patients/:id/compliance', requireRole('provider'), providerController.updateCompliance);

module.exports = router;
