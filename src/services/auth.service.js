// src/services/auth.service.js
const User = require('../models/user.model');
const Patient = require('../models/patientProfile.model');
const Provider = require('../models/provider.model');
const Consent = require('../models/consent.model');
const { hashPassword, comparePassword } = require('../utils/password.util');
const jwtUtil = require('../utils/jwt.util');

/**
 * AuthService
 *
 * - createPatientAccount(payload, ipAddress)
 * - authenticate(email, password)
 * - refreshAuth(oldRefreshToken)
 * - revokeTokens(userId, refreshToken?)  // if refreshToken omitted, revoke all
 */

module.exports = {
  /**
   * Create a new patient account.
   * - payload: { email, password, name?, age?, allergies?, medications?, consent? }
   * - ipAddress: for consent logging
   * Returns: { user: { id, email, role }, accessToken, refreshToken }
   */
  createPatientAccount: async (payload, ipAddress = null) => {
    const { email, password, name, age, allergies = [], medications = [], consent = true } = payload;

    if (!email || !password) {
      const err = new Error('Email and password required');
      err.status = 400;
      throw err;
    }

    // Require consent for registration
    if (!consent) {
      const err = new Error('You must accept the terms and privacy policy to register');
      err.status = 400;
      throw err;
    }

    // Check existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (role = patient)
    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'patient',
      refreshTokens: []
    });

    // Assign a provider (provider with fewest patients - using aggregation)
    let assignedProviderId = null;
    const providers = await Provider.aggregate([
      {
        $addFields: {
          patientCount: { $size: { $ifNull: ["$patients", []] } }
        }
      },
      { $sort: { patientCount: 1 } },
      { $limit: 1 }
    ]);
    
    if (providers.length > 0) {
      assignedProviderId = providers[0]._id;
    }

    // Create patient profile
    const patientProfile = await Patient.create({
      user: newUser._id,
      name: name || '',
      age: age || null,
      allergies,
      medications,
      assignedProvider: assignedProviderId,
      goals: [],
      reminders: []
    });

    // If provider found, push patient to provider.patients list
    if (assignedProviderId) {
      await Provider.findByIdAndUpdate(assignedProviderId, {
        $push: { patients: patientProfile._id }
      });
    }

    // Record consent for data processing
    await Consent.recordRegistrationConsents(newUser._id, ipAddress);

    // Create tokens
    const accessToken = jwtUtil.signAccessToken({ _id: newUser._id, role: newUser.role, email: newUser.email });
    const refreshToken = jwtUtil.signRefreshToken({ _id: newUser._id, role: newUser.role });

    // Save refresh token to user
    newUser.refreshTokens.push(refreshToken);
    await newUser.save();

    return {
      user: { id: newUser._id, email: newUser.email, role: newUser.role },
      accessToken,
      refreshToken
    };
  },

  /**
   * Authenticate user with email + password.
   * Returns tokens + user info.
   */
  authenticate: async (email, password) => {
    if (!email || !password) {
      const err = new Error('Email and password required');
      err.status = 400;
      throw err;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Generate tokens
    const accessToken = jwtUtil.signAccessToken({ _id: user._id, role: user.role, email: user.email });
    const refreshToken = jwtUtil.signRefreshToken({ _id: user._id, role: user.role });

    // Save refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    return {
      user: { id: user._id, email: user.email, role: user.role },
      accessToken,
      refreshToken
    };
  },

  /**
   * Given an old refresh token, verify and rotate tokens.
   * Returns { accessToken, refreshToken, user }
   */
  refreshAuth: async (oldRefreshToken) => {
    if (!oldRefreshToken) {
      const err = new Error('Refresh token required');
      err.status = 400;
      throw err;
    }

    // Verify token signature & decode
    let decoded;
    try {
      decoded = jwtUtil.verifyRefreshToken(oldRefreshToken);
    } catch (e) {
      const err = new Error('Invalid refresh token');
      err.status = 401;
      throw err;
    }

    const userId = decoded.sub || decoded._id;
    if (!userId) {
      const err = new Error('Invalid refresh token payload');
      err.status = 401;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found for refresh token');
      err.status = 401;
      throw err;
    }

    // Ensure the refresh token is active / stored for this user (simple lookup)
    const exists = user.refreshTokens && user.refreshTokens.includes(oldRefreshToken);
    if (!exists) {
      const err = new Error('Refresh token not recognized');
      err.status = 401;
      throw err;
    }

    // Rotate: remove old, create new
    user.refreshTokens = user.refreshTokens.filter(t => t !== oldRefreshToken);

    const newAccessToken = jwtUtil.signAccessToken({ _id: user._id, role: user.role, email: user.email });
    const newRefreshToken = jwtUtil.signRefreshToken({ _id: user._id, role: user.role });

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return {
      user: { id: user._id, email: user.email, role: user.role },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  },

  /**
   * Revoke refresh tokens. If refreshToken param is provided, remove only that token,
   * otherwise remove all refresh tokens for the user (logout everywhere).
   */
  revokeTokens: async (userId, refreshToken) => {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    } else {
      user.refreshTokens = [];
    }

    await user.save();
    return true;
  }
};
