// src/services/scheduler.service.js
/*
  Scheduler service exposes functions referenced by cron jobs.
  Implementations are left as stubs for now.
*/

module.exports = {
  sendDailyWellnessReminders: async () => {
    // Function name: sendDailyWellnessReminders
    // TODO: find patients, compose messages, call notification service
    console.log('Scheduler: sendDailyWellnessReminders called (stub)');
  },

  createPreventiveCareReminders: async () => {
    // Function name: createPreventiveCareReminders
    console.log('Scheduler: createPreventiveCareReminders called (stub)');
  },

  weeklyProviderSummary: async () => {
    // Function name: weeklyProviderSummary
    console.log('Scheduler: weeklyProviderSummary called (stub)');
  }
};
