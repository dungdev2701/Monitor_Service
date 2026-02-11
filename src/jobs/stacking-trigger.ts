import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Stacking Trigger Job
 *
 * Kiểm tra và trigger stacking cho các requests đã đạt threshold
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/trigger-stacking
 * 2. API sẽ tìm RUNNING/COMPLETED requests có CONNECT tasks (đang chờ threshold)
 * 3. Kiểm tra threshold:
 *    - entityConnect = 'all': linkProfile count >= entityLimit
 *    - entityConnect = 'limit': linkProfile count >= limit value
 * 4. Khi đạt threshold: Chuyển status từ CONNECT → CONNECTING
 * 5. Tools có thể claim các CONNECTING tasks để thực hiện stacking
 *
 * Status flow:
 * - CONNECT: Đang chờ đủ điều kiện stacking (không thể claim)
 * - CONNECTING: Sẵn sàng stacking (tool có thể claim)
 *
 * Interval: 30 giây (configurable via STACKING_TRIGGER_INTERVAL_MS)
 */
async function runStackingTriggerJob(): Promise<void> {
  if (isRunning) {
    logger.warn('Stacking trigger job is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting stacking trigger job...');

    const result = await managerApi.triggerStackingForReadyRequests();

    const { triggered, updatedItems, details } = result.data;

    if (triggered > 0) {
      logger.info(`Stacking trigger completed`, {
        triggered,
        updatedItems,
        details,
      });
    } else {
      logger.debug('No requests ready for stacking');
    }
  } catch (error) {
    logger.error('Stacking trigger job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the stacking trigger job
 * Runs at the configured interval (default: 30s)
 */
export function startStackingTriggerJob(): NodeJS.Timeout {
  const intervalMs = config.stackingTrigger.intervalMs;

  logger.info(`Starting Stacking Trigger Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Triggers stacking for requests that reached threshold (all/limit entityConnect)',
  });

  // Run immediately on start
  runStackingTriggerJob();

  // Then run at interval
  return setInterval(runStackingTriggerJob, intervalMs);
}

/**
 * Stop the stacking trigger job
 */
export function stopStackingTriggerJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Stacking Trigger Job stopped');
}
