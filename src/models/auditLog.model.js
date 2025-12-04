// src/models/auditLog.model.js
const { Schema, model } = require('mongoose');

/**
 * AuditLog - HIPAA-compliant access logging
 * Records all access to protected health information (PHI)
 */
const AuditLogSchema = new Schema({
  // Who performed the action
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  userEmail: { 
    type: String 
  },
  userRole: { 
    type: String,
    enum: ['patient', 'provider', 'admin', 'system', null],
    default: null
  },
  
  // What action was performed
  action: { 
    type: String, 
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'REGISTER',
      'PASSWORD_CHANGE',
      'PROFILE_VIEW',
      'PROFILE_UPDATE',
      'PHI_ACCESS',        // Protected Health Info accessed
      'PHI_UPDATE',        // Protected Health Info modified
      'PATIENT_VIEW',      // Provider viewed patient data
      'WELLNESS_LOG',      // Patient logged wellness data
      'APPOINTMENT_CREATE',
      'APPOINTMENT_UPDATE',
      'APPOINTMENT_CANCEL',
      'COMPLIANCE_UPDATE',
      'CONSENT_GIVEN',
      'CONSENT_REVOKED',
      'DATA_EXPORT',
      'TOKEN_REFRESH',
      'UNAUTHORIZED_ACCESS'
    ],
    index: true
  },
  
  // What resource was affected
  resourceType: { 
    type: String,
    enum: ['User', 'PatientProfile', 'Provider', 'Appointment', 'WellnessLog', 'Consent', 'System']
  },
  resourceId: { 
    type: Schema.Types.ObjectId 
  },
  
  // Request details
  method: { 
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  endpoint: { 
    type: String 
  },
  ipAddress: { 
    type: String 
  },
  userAgent: { 
    type: String 
  },
  
  // Additional context
  details: { 
    type: Schema.Types.Mixed // Flexible object for additional info
  },
  
  // Outcome
  success: { 
    type: Boolean, 
    default: true 
  },
  errorMessage: { 
    type: String 
  },
  
  // Timestamp
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
}, { 
  timestamps: false // We use our own timestamp field
});

// Indexes for common query patterns
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

// Static method to log an action
AuditLogSchema.statics.log = async function(data) {
  try {
    return await this.create({
      userId: data.userId || null,
      userEmail: data.userEmail || null,
      userRole: data.userRole || null,
      action: data.action,
      resourceType: data.resourceType || null,
      resourceId: data.resourceId || null,
      method: data.method || null,
      endpoint: data.endpoint || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      details: data.details || null,
      success: data.success !== undefined ? data.success : true,
      errorMessage: data.errorMessage || null,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Don't throw - logging should not break the application
  }
};

// Static method to query user activity
AuditLogSchema.statics.getUserActivity = function(userId, startDate, endDate) {
  return this.find({
    userId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: -1 });
};

// Static method to query PHI access
AuditLogSchema.statics.getPHIAccess = function(resourceId, startDate, endDate) {
  return this.find({
    resourceId,
    action: { $in: ['PHI_ACCESS', 'PHI_UPDATE', 'PATIENT_VIEW'] },
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: -1 });
};

module.exports = model('AuditLog', AuditLogSchema);
