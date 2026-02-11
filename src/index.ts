import { config } from './config';
import { logger } from './logger';
import { managerApi } from './api-client';
import { startDeadCheckerJob, stopDeadCheckerJob } from './jobs/dead-checker';
import { startAllocationProcessorJob, stopAllocationProcessorJob } from './jobs/allocation-processor';
import { startExpiredClaimsReleaseJob, stopExpiredClaimsReleaseJob } from './jobs/expired-claims-release';
import { startRequestTimeoutJob, stopRequestTimeoutJob } from './jobs/request-timeout';
import { startStackingTriggerJob, stopStackingTriggerJob } from './jobs/stacking-trigger';

let deadCheckerIntervalId: NodeJS.Timeout | null = null;
let allocationProcessorIntervalId: NodeJS.Timeout | null = null;
let expiredClaimsReleaseIntervalId: NodeJS.Timeout | null = null;
let requestTimeoutIntervalId: NodeJS.Timeout | null = null;
let stackingTriggerIntervalId: NodeJS.Timeout | null = null;

/**
 * Validate configuration before starting
 */
function validateConfig(): void {
  if (!config.monitorApiKey) {
    throw new Error('MONITOR_API_KEY is required');
  }

  if (!config.managerApiUrl) {
    throw new Error('MANAGER_API_URL is required');
  }
}

/**
 * Check connection to Manager Site API
 */
async function checkConnection(): Promise<boolean> {
  try {
    const health = await managerApi.healthCheck();
    logger.info('Connected to Manager Site API', { status: health.status });
    return true;
  } catch (error) {
    logger.error('Failed to connect to Manager Site API', error);
    return false;
  }
}

/**
 * Start the monitor service
 */
async function start(): Promise<void> {
  logger.info('========================================');
  logger.info('Starting Monitor Service...');
  logger.info('========================================');

  // Validate config
  validateConfig();

  logger.info('Configuration:', {
    managerApiUrl: config.managerApiUrl,
    deadCheckerInterval: `${config.deadChecker.intervalMs / 1000}s`,
    allocationProcessorInterval: `${config.allocationProcessor.intervalMs / 1000}s`,
    expiredClaimsReleaseInterval: `${config.expiredClaimsRelease.intervalMs / 1000}s`,
    requestTimeoutInterval: `${config.requestTimeout.intervalMs / 1000}s`,
    stackingTriggerInterval: `${config.stackingTrigger.intervalMs / 1000}s`,
  });

  // Check connection
  const connected = await checkConnection();
  if (!connected) {
    logger.error('Cannot connect to Manager Site API. Exiting...');
    process.exit(1);
  }

  // Start jobs
  deadCheckerIntervalId = startDeadCheckerJob();
  allocationProcessorIntervalId = startAllocationProcessorJob();
  expiredClaimsReleaseIntervalId = startExpiredClaimsReleaseJob();
  requestTimeoutIntervalId = startRequestTimeoutJob();
  stackingTriggerIntervalId = startStackingTriggerJob();

  logger.info('Monitor Service is running');
  logger.info('Press Ctrl+C to stop');
}

/**
 * Graceful shutdown
 */
function shutdown(): void {
  logger.info('Shutting down Monitor Service...');

  if (deadCheckerIntervalId) {
    stopDeadCheckerJob(deadCheckerIntervalId);
  }

  if (allocationProcessorIntervalId) {
    stopAllocationProcessorJob(allocationProcessorIntervalId);
  }

  if (expiredClaimsReleaseIntervalId) {
    stopExpiredClaimsReleaseJob(expiredClaimsReleaseIntervalId);
  }

  if (requestTimeoutIntervalId) {
    stopRequestTimeoutJob(requestTimeoutIntervalId);
  }

  if (stackingTriggerIntervalId) {
    stopStackingTriggerJob(stackingTriggerIntervalId);
  }

  logger.info('Monitor Service stopped');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdown();
});

// Start the service
start().catch((error) => {
  logger.error('Failed to start Monitor Service:', error);
  process.exit(1);
});
