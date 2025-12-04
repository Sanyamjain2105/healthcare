// src/controllers/auth.controller.js
const AuthService = require('../services/auth.service');

const respondError = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};

module.exports = {
  registerPatient: async (req, res, next) => {
    // Function name: registerPatient
    try {
      const payload = req.body;
      const result = await AuthService.createPatientAccount(payload);
      return res.status(201).json(result);
    } catch (err) {
      return respondError(res, err);
    }
  },

  login: async (req, res, next) => {
    // Function name: login
    try {
      const { email, password } = req.body;
      const result = await AuthService.authenticate(email, password);
      return res.status(200).json(result);
    } catch (err) {
      return respondError(res, err);
    }
  },

  refreshToken: async (req, res, next) => {
    // Function name: refreshToken
    try {
      // expecting { refreshToken } in body
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAuth(refreshToken);
      return res.status(200).json(result);
    } catch (err) {
      return respondError(res, err);
    }
  },

  logout: async (req, res, next) => {
    // Function name: logout
    try {
      // If user is logged in, req.user may exist (via authMiddleware).
      // We accept: body: { refreshToken } to revoke single device, or if authenticated and no token => revoke all for that user.
      const { refreshToken } = req.body || {};

      // If req.user available (via auth middleware), use that user id, else try to extract from refresh token
      let userId = null;
      if (req.user && req.user.sub) userId = req.user.sub;
      if (req.user && req.user._id) userId = req.user._id;
      if (!userId && refreshToken) {
        // try decode refresh token to get sub
        try {
          const decoded = require('../utils/jwt.util').verifyRefreshToken(refreshToken);
          userId = decoded.sub || decoded._id;
        } catch (e) {
          // ignore, we'll still attempt revoke by token if possible
        }
      }

      if (!userId && !refreshToken) {
        return res.status(400).json({ error: 'Provide refreshToken or be authenticated to logout' });
      }

      if (userId) {
        await AuthService.revokeTokens(userId, refreshToken);
      } else {
        // If we have only refreshToken and couldn't decode user, respond 400
        return res.status(400).json({ error: 'Unable to determine user from provided token' });
      }

      return res.status(200).json({ message: 'Logged out (tokens revoked)' });
    } catch (err) {
      return respondError(res, err);
    }
  }
};
