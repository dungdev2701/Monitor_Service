import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Re-Allocation Job
 *
 * Phân bổ thêm websites cho requests đang chạy nhưng kết quả chưa đủ.
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/re-allocate
 * 2. API sẽ tìm PENDING/RUNNING requests
 * 3. Check: không còn items NEW/REGISTERING/PROFILING (tất cả đã xử lý)
 * 4. Check: completedLinks < entityLimit (kết quả chưa đủ)
 * 5. Phân bổ thêm dựa trên số thiếu, loại trừ domains đã dùng
 *
 * Interval: 60 giây (configurable via RE_ALLOCATION_INTERVAL_MS)
 */
async function runReAllocation(): Promise<void> {
  if (isRunning) {
    logger.warn('Re-allocation job is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting re-allocation job...');

    const result = await managerApi.reAllocate();

    const { processed, skipped, details } = result.data;

    if (processed > 0) {
      logger.info(`Re-allocation completed`, {
        processed,
        skipped,
        details: details.map((d) => `${d.requestId}: deficit=${d.deficit}, allocated=${d.allocated}`),
      });
    } else {
      logger.debug('No requests need re-allocation');
    }
  } catch (error) {
    logger.error('Re-allocation job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the re-allocation job
 * Runs at the configured interval (default: 60s)
 */
export function startReAllocationJob(): NodeJS.Timeout {
  const intervalMs = config.reAllocation.intervalMs;

  logger.info(`Starting Re-Allocation Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Re-allocates websites for active requests that need more items',
  });

  // Run immediately on start
  runReAllocation();

  // Then run at interval
  return setInterval(runReAllocation, intervalMs);
}

/**
 * Stop the re-allocation job
 */
export function stopReAllocationJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Re-Allocation Job stopped');
}
