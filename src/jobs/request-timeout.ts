import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Request Timeout Job
 *
 * Kiểm tra và timeout các requests đã hết thời gian hoàn thành
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/timeout-requests
 * 2. API sẽ tìm RUNNING requests đã hết timeout
 * 3. Timeout calculation:
 *    - entityLimit >= 100: timeout = (entityLimit / 100) * REQUEST_COMPLETION_TIME_PER_100
 *    - entityLimit < 100: timeout = 30 phút (cố định, ưu tiên hoàn thành)
 * 4. Mark request as COMPLETED
 * 5. Cancel all pending/processing allocation items
 *
 * Interval: 60 giây (configurable via REQUEST_TIMEOUT_INTERVAL_MS)
 */
async function runRequestTimeoutJob(): Promise<void> {
  if (isRunning) {
    logger.warn('Request timeout job is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting request timeout job...');

    const result = await managerApi.timeoutExpiredRequests();

    const { timedOut, cancelledItems } = result.data;

    if (timedOut > 0) {
      logger.warn(`Request timeout completed`, {
        timedOut,
        cancelledItems,
      });
    } else {
      logger.debug('No requests to timeout');
    }
  } catch (error) {
    logger.error('Request timeout job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the request timeout job
 * Runs at the configured interval (default: 60s)
 */
export function startRequestTimeoutJob(): NodeJS.Timeout {
  const intervalMs = config.requestTimeout.intervalMs;

  logger.info(`Starting Request Timeout Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Timeouts RUNNING requests that exceeded completion time',
  });

  // Run immediately on start
  runRequestTimeoutJob();

  // Then run at interval
  return setInterval(runRequestTimeoutJob, intervalMs);
}

/**
 * Stop the request timeout job
 */
export function stopRequestTimeoutJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Request Timeout Job stopped');
}
