// src/middlewares/audit.middleware.js
const AuditLog = require('../models/auditLog.model');

/**
 * Audit logging middleware for HIPAA compliance
 * Automatically logs access to protected endpoints
 */

// Map endpoints to action types
const endpointActionMap = {
  'GET /api/patients/me': 'PROFILE_VIEW',
  'PUT /api/patients/me': 'PROFILE_UPDATE',
  'GET /api/patients/dashboard': 'PHI_ACCESS',
  'POST /api/patients/goals': 'PHI_UPDATE',
  'POST /api/patients/goals/': 'PHI_UPDATE',
  'GET /api/patients/wellness': 'PHI_ACCESS',
  'POST /api/patients/wellness': 'WELLNESS_LOG',
  'PUT /api/patients/wellness': 'WELLNESS_LOG',
  'GET /api/providers/patients': 'PATIENT_VIEW',
  'GET /api/providers/patients/': 'PATIENT_VIEW',
  'POST /api/providers/patients/': 'COMPLIANCE_UPDATE',
  'GET /api/appointments': 'PHI_ACCESS',
  'POST /api/appointments': 'APPOINTMENT_CREATE',
  'PUT /api/appointments/': 'APPOINTMENT_UPDATE',
  'DELETE /api/appointments/': 'APPOINTMENT_CANCEL'
};

/**
 * Determines the action type from the request
 */
const getActionType = (method, path) => {
  const key = `${method} ${path}`;
  
  // Check exact match first
  if (endpointActionMap[key]) {
    return endpointActionMap[key];
  }
  
  // Check prefix matches (for paths with IDs)
  for (const [pattern, action] of Object.entries(endpointActionMap)) {
    if (pattern.endsWith('/') && key.startsWith(pattern)) {
      return action;
    }
  }
  
  return null;
};

/**
 * Determines resource type from the path
 */
const getResourceType = (path) => {
  if (path.includes('/patients')) return 'PatientProfile';
  if (path.includes('/providers')) return 'Provider';
  if (path.includes('/appointments')) return 'Appointment';
  if (path.includes('/wellness')) return 'WellnessLog';
  if (path.includes('/auth')) return 'User';
  return 'System';
};

/**
 * Extracts resource ID from path if present
 */
const extractResourceId = (path) => {
  // Match MongoDB ObjectId pattern in path
  const match = path.match(/\/([a-f\d]{24})(?:\/|$)/i);
  return match ? match[1] : null;
};

/**
 * Gets client IP address
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

/**
 * Audit middleware - logs API access
 */
const auditMiddleware = async (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;
  const startTime = Date.now();
  
  // Override res.end to capture response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Log after response is sent (async, don't wait)
    const action = getActionType(req.method, req.path);
    
    // Only log if it's a tracked action
    if (action) {
      const logData = {
        userId: req.user?.sub || req.user?._id || null,
        userEmail: req.user?.email || null,
        userRole: req.user?.role || null,
        action,
        resourceType: getResourceType(req.path),
        resourceId: extractResourceId(req.path),
        method: req.method,
        endpoint: req.originalUrl || req.path,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || null,
        details: {
          responseTime: Date.now() - startTime,
          statusCode: res.statusCode,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        },
        success: res.statusCode >= 200 && res.statusCode < 400,
        errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
      };
      
      // Fire and forget - don't await
      AuditLog.log(logData).catch(err => {
        console.error('Audit log failed:', err.message);
      });
    }
  };
  
  next();
};

/**
 * Log authentication events explicitly
 */
const logAuthEvent = async (action, req, options = {}) => {
  const logData = {
    userId: options.userId || req.user?.sub || req.user?._id || null,
    userEmail: options.email || req.user?.email || req.body?.email || null,
    userRole: options.role || req.user?.role || null,
    action,
    resourceType: 'User',
    resourceId: options.userId || null,
    method: req.method,
    endpoint: req.originalUrl || req.path,
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] || null,
    details: options.details || null,
    success: options.success !== undefined ? options.success : true,
    errorMessage: options.errorMessage || null
  };
  
  return AuditLog.log(logData);
};

/**
 * Log PHI access explicitly
 */
const logPHIAccess = async (req, resourceType, resourceId, action = 'PHI_ACCESS') => {
  const logData = {
    userId: req.user?.sub || req.user?._id || null,
    userEmail: req.user?.email || null,
    userRole: req.user?.role || null,
    action,
    resourceType,
    resourceId,
    method: req.method,
    endpoint: req.originalUrl || req.path,
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] || null,
    success: true
  };
  
  return AuditLog.log(logData);
};

module.exports = {
  auditMiddleware,
  logAuthEvent,
  logPHIAccess,
  getClientIP
};
