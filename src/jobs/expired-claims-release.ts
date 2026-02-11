import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Expired Claims Release Job
 *
 * Release các claims đã hết timeout để tools khác có thể claim lại
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/release-expired
 * 2. API sẽ tìm allocation items có:
 *    - status = CLAIMED
 *    - claimedAt + claimTimeout < now
 * 3. Reset các items này về status = PENDING
 * 4. Tools có thể claim lại các items này
 *
 * Interval: 60 giây (configurable via EXPIRED_CLAIMS_RELEASE_INTERVAL_MS)
 */
async function runExpiredClaimsRelease(): Promise<void> {
  if (isRunning) {
    logger.warn('Expired claims release is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting expired claims release job...');

    const result = await managerApi.releaseExpiredClaims();

    if (result.data.releasedCount > 0) {
      logger.info(`Released ${result.data.releasedCount} expired claims back to PENDING`);
    } else {
      logger.debug('No expired claims to release');
    }
  } catch (error) {
    logger.error('Expired claims release job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the expired claims release job
 * Runs at the configured interval (default: 60s)
 */
export function startExpiredClaimsReleaseJob(): NodeJS.Timeout {
  const intervalMs = config.expiredClaimsRelease.intervalMs;

  logger.info(`Starting Expired Claims Release Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Releases expired claims back to PENDING for retry',
  });

  // Run immediately on start
  runExpiredClaimsRelease();

  // Then run at interval
  return setInterval(runExpiredClaimsRelease, intervalMs);
}

/**
 * Stop the expired claims release job
 */
export function stopExpiredClaimsReleaseJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Expired Claims Release Job stopped');
}
