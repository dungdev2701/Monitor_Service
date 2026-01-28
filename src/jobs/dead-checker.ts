import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Dead Checker Job
 *
 * Kiểm tra và đánh dấu tools không update quá estimateTime thành DIE
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/monitor/mark-stale-dead
 * 2. API sẽ tìm tools có status=RUNNING và updatedAt > estimateTime của tool đó
 * 3. Nếu tool không có estimateTime → mặc định 5 phút và cập nhật vào DB
 * 4. Cập nhật status = DIE cho các tools stale
 * 5. Trả về danh sách tools đã được đánh dấu
 */
async function runDeadChecker(): Promise<void> {
  if (isRunning) {
    logger.warn('Dead checker is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting dead checker job...');

    const result = await managerApi.markStaleToolsAsDead();

    if (result.data.markedCount > 0) {
      logger.info(`Marked ${result.data.markedCount} stale tools as DIE`, {
        tools: result.data.tools.map((t) => `${t.idTool} (${t.estimateTime}min)`),
      });
    } else {
      logger.debug('No stale tools found');
    }

    if (result.data.estimateTimeUpdated > 0) {
      logger.info(`Updated estimateTime for ${result.data.estimateTimeUpdated} tools (set to 5 min)`);
    }
  } catch (error) {
    logger.error('Dead checker job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the dead checker job
 * Runs at the configured interval
 */
export function startDeadCheckerJob(): NodeJS.Timeout {
  const intervalMs = config.deadChecker.intervalMs;

  logger.info(`Starting Dead Checker Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Uses each tool\'s estimateTime (default: 5 min)',
  });

  // Run immediately on start
  runDeadChecker();

  // Then run at interval
  return setInterval(runDeadChecker, intervalMs);
}

/**
 * Stop the dead checker job
 */
export function stopDeadCheckerJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Dead Checker Job stopped');
}
