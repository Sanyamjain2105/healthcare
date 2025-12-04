// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// authMiddleware: extracts bearer token and attaches req.user (basic stub)
module.exports.authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid Authorization format' });
  }
  const token = parts[1];
  try {
    // NOTE: This is a minimal verification - replace with full checks & refresh logic.
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// requireRole: ensures req.user.role matches
module.exports.requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
  if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
  return next();
};
