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

  // Allocation Processor Job
  allocationProcessor: {
    // Interval between checks (milliseconds) - default 30 seconds
    intervalMs: parseInt(process.env.ALLOCATION_PROCESSOR_INTERVAL_MS || '30000', 10),
  },

  // Expired Claims Release Job
  expiredClaimsRelease: {
    // Interval between checks (milliseconds) - default 60 seconds
    intervalMs: parseInt(process.env.EXPIRED_CLAIMS_RELEASE_INTERVAL_MS || '60000', 10),
  },

  // Request Timeout Job
  requestTimeout: {
    // Interval between checks (milliseconds) - default 60 seconds
    intervalMs: parseInt(process.env.REQUEST_TIMEOUT_INTERVAL_MS || '60000', 10),
  },

  // Stacking Trigger Job
  stackingTrigger: {
    // Interval between checks (milliseconds) - default 30 seconds
    // Runs frequently to trigger stacking as soon as threshold is met
    intervalMs: parseInt(process.env.STACKING_TRIGGER_INTERVAL_MS || '30000', 10),
  },

  // Tool Auto-Assign Job
  toolAutoAssign: {
    // Interval between checks (milliseconds) - default 30 seconds
    // Runs before allocation processor to ensure idTool is set before websites are allocated
    intervalMs: parseInt(process.env.TOOL_AUTO_ASSIGN_INTERVAL_MS || '30000', 10),
  },

  // Re-Allocation Job
  reAllocation: {
    // Interval between checks (milliseconds) - default 60 seconds
    // Checks active requests that need more website allocations
    intervalMs: parseInt(process.env.RE_ALLOCATION_INTERVAL_MS || '60000', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
