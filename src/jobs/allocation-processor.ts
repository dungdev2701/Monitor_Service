import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Allocation Processor Job
 *
 * Kiểm tra và phân bổ websites cho NEW service requests
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/process
 * 2. API sẽ tìm service requests có status = NEW
 * 3. Phân bổ available websites cho từng request
 * 4. Tạo allocation items với status = PENDING
 * 5. Tools sẽ claim các items này để xử lý
 *
 * Interval: 30 giây (configurable via ALLOCATION_PROCESSOR_INTERVAL_MS)
 */
async function runAllocationProcessor(): Promise<void> {
  if (isRunning) {
    logger.warn('Allocation processor is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting allocation processor job...');

    const result = await managerApi.processAllocation();

    const { processed, skipped, failed } = result.data;

    if (processed > 0 || skipped > 0 || failed > 0) {
      logger.info(`Allocation processor completed`, {
        processed,
        skipped,
        failed,
      });
    } else {
      logger.debug('No new requests to process');
    }

    if (failed > 0) {
      logger.warn(`${failed} requests failed to process - check Manager Site API logs for details`);
    }
  } catch (error) {
    logger.error('Allocation processor job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the allocation processor job
 * Runs at the configured interval (default: 30s)
 */
export function startAllocationProcessorJob(): NodeJS.Timeout {
  const intervalMs = config.allocationProcessor.intervalMs;

  logger.info(`Starting Allocation Processor Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Processes NEW service requests and allocates websites',
  });

  // Run immediately on start
  runAllocationProcessor();

  // Then run at interval
  return setInterval(runAllocationProcessor, intervalMs);
}

/**
 * Stop the allocation processor job
 */
export function stopAllocationProcessorJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Allocation Processor Job stopped');
}
