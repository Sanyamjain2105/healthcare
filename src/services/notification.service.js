// src/services/notification.service.js
/*
  NotificationService - stubbed. Replace with email / SMS / push integration.
*/
module.exports = {
  notifyPatient: async (patientId, payload) => {
    // Function name: notifyPatient
    console.log(`notifyPatient called for ${patientId}`, payload);
  },

  notifyProvider: async (providerId, payload) => {
    // Function name: notifyProvider
    console.log(`notifyProvider called for ${providerId}`, payload);
  }
};
