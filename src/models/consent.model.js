// src/models/consent.model.js
const { Schema, model } = require('mongoose');

/**
 * Consent - Tracks user consent for data processing (HIPAA/GDPR compliance)
 */
const ConsentSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // Type of consent given
  consentType: { 
    type: String, 
    required: true,
    enum: [
      'terms_of_service',
      'privacy_policy',
      'data_processing',
      'health_data_sharing',
      'provider_access',
      'email_notifications',
      'sms_notifications',
      'marketing',
      'research_participation'
    ],
    index: true
  },
  
  // Version of the policy/terms consented to
  version: { 
    type: String, 
    required: true 
  },
  
  // Consent status
  granted: { 
    type: Boolean, 
    required: true 
  },
  
  // When consent was given/revoked
  grantedAt: { 
    type: Date 
  },
  revokedAt: { 
    type: Date 
  },
  
  // How consent was obtained
  method: { 
    type: String,
    enum: ['registration', 'settings', 'api', 'manual'],
    default: 'registration'
  },
  
  // IP address when consent was given (for audit)
  ipAddress: { 
    type: String 
  },
  
  // Additional context
  notes: { 
    type: String,
    maxlength: 500 
  }
}, { 
  timestamps: true 
});

// Compound index for efficient lookups
ConsentSchema.index({ user: 1, consentType: 1 });

// Static method to check if user has valid consent
ConsentSchema.statics.hasConsent = async function(userId, consentType) {
  const consent = await this.findOne({ 
    user: userId, 
    consentType,
    granted: true,
    revokedAt: null
  });
  return !!consent;
};

// Static method to grant consent
ConsentSchema.statics.grant = async function(userId, consentType, version, options = {}) {
  // Revoke any existing consent of this type first
  await this.updateMany(
    { user: userId, consentType, granted: true, revokedAt: null },
    { revokedAt: new Date() }
  );
  
  return await this.create({
    user: userId,
    consentType,
    version,
    granted: true,
    grantedAt: new Date(),
    method: options.method || 'api',
    ipAddress: options.ipAddress || null,
    notes: options.notes || null
  });
};

// Static method to revoke consent
ConsentSchema.statics.revoke = async function(userId, consentType) {
  return await this.updateMany(
    { user: userId, consentType, granted: true, revokedAt: null },
    { revokedAt: new Date(), granted: false }
  );
};

// Static method to get all active consents for a user
ConsentSchema.statics.getUserConsents = async function(userId) {
  return await this.find({
    user: userId,
    granted: true,
    revokedAt: null
  });
};

// Static method to record all required consents during registration
ConsentSchema.statics.recordRegistrationConsents = async function(userId, ipAddress) {
  const requiredConsents = [
    { type: 'terms_of_service', version: '1.0' },
    { type: 'privacy_policy', version: '1.0' },
    { type: 'data_processing', version: '1.0' },
    { type: 'health_data_sharing', version: '1.0' }
  ];
  
  const consents = [];
  for (const consent of requiredConsents) {
    const record = await this.grant(userId, consent.type, consent.version, {
      method: 'registration',
      ipAddress
    });
    consents.push(record);
  }
  
  return consents;
};

module.exports = model('Consent', ConsentSchema);
