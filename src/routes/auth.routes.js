// src/routes/auth.routes.js
const Router = require('express').Router;
const router = Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

// Apply rate limiting to auth endpoints
router.use(authLimiter);

// Registration only for patients
router.post('/register', authController.registerPatient);
// Login for both roles
router.post('/login', authController.login);
// token endpoints
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
