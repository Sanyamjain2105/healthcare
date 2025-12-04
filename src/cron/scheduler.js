// src/cron/scheduler.js
const cron = require('node-cron');
const SchedulerService = require('../services/scheduler.service');

const jobs = [];

module.exports.startAll = () => {
  // daily at 07:00 server time
  jobs.push(cron.schedule('0 7 * * *', () => {
    SchedulerService.sendDailyWellnessReminders().catch(console.error);
  }));

  // hourly
  jobs.push(cron.schedule('0 * * * *', () => {
    SchedulerService.createPreventiveCareReminders().catch(console.error);
  }));

  // weekly on monday at 08:00
  jobs.push(cron.schedule('0 8 * * 1', () => {
    SchedulerService.weeklyProviderSummary().catch(console.error);
  }));

  console.log('Cron jobs scheduled (stubs).');
};

module.exports.stopAll = () => jobs.forEach(j => j.stop());
