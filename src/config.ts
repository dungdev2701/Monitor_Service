import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  // Manager Site API
  managerApiUrl: process.env.MANAGER_API_URL || 'http://localhost:3005',
  monitorApiKey: process.env.MONITOR_API_KEY || '',

  // Dead Checker Job
  deadChecker: {
    // Interval between checks (milliseconds) - default 60 seconds
    intervalMs: parseInt(process.env.DEAD_CHECKER_INTERVAL_MS || '60000', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
