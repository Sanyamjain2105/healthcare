// src/utils/jwt.util.js
const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const SECRET = process.env.JWT_SECRET || 'dev_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

module.exports = {
  signAccessToken: (user) => {
    // Function name: signAccessToken
    const payload = { sub: user._id, role: user.role, email: user.email };
    return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES });
  },

  signRefreshToken: (user) => {
    // Function name: signRefreshToken
    const payload = { sub: user._id, role: user.role };
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  },

  verifyAccessToken: (token) => {
    // Function name: verifyAccessToken
    return jwt.verify(token, SECRET);
  },

  verifyRefreshToken: (token) => {
    // Function name: verifyRefreshToken
    return jwt.verify(token, REFRESH_SECRET);
  }
};
