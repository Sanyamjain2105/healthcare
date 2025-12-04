// src/middlewares/rateLimit.middleware.js

/**
 * Simple in-memory rate limiter
 * For production, use Redis-backed solution (e.g., express-rate-limit with redis store)
 */

const requestCounts = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > 60000) { // 1 minute window
      requestCounts.delete(key);
    }
  }
}, 300000);

/**
 * Creates a rate limiter middleware
 * @param {Object} options 
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message when rate limited
 * @param {function} options.keyGenerator - Function to generate unique key (default: IP)
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => {
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             'unknown';
    }
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    if (!record || (now - record.windowStart) > windowMs) {
      // New window
      record = { count: 1, windowStart: now };
      requestCounts.set(key, record);
    } else {
      record.count++;
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.windowStart + windowMs).toISOString());
    
    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.windowStart + windowMs - now) / 1000));
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
      });
    }
    
    next();
  };
};

// Pre-configured limiters for different use cases

/**
 * General API rate limiter - 100 requests per minute
 */
const apiLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

/**
 * Auth rate limiter - 5 attempts per minute (for login/register)
 */
const authLimiter = createRateLimiter({
  windowMs: 60000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => {
    // Use IP + email for auth endpoints
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.connection?.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    return `auth:${ip}:${email}`;
  }
});

/**
 * Strict rate limiter - 10 requests per minute (for sensitive operations)
 */
const strictLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10,
  message: 'Rate limit exceeded for sensitive operation.'
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  strictLimiter
};
