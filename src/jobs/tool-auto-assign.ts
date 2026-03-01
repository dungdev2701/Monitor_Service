import { config } from '../config';
import { logger } from '../logger';
import { managerApi } from '../api-client';

let isRunning = false;

/**
 * Tool Auto-Assign Job
 *
 * Auto-assigns idTool to NEW/PENDING service requests that don't have one.
 *
 * Logic:
 * 1. Gọi API Manager Site: POST /api/public/allocation-tasks/auto-assign-tools
 * 2. API sẽ tìm valid tool pairs (Normal X + Captcha X, both RUNNING + INDIVIDUAL)
 * 3. Tìm requests chưa có idTool (status NEW/PENDING, idTool IS NULL)
 * 4. customerType='priority' → assign to HIGH/URGENT requests
 * 5. customerType='normal'/null → assign to LOW/NORMAL requests
 * 6. Within same priority group: auctionPrice DESC, createdAt ASC
 * 7. Round-robin distribute across available pairs
 * 8. If no matching tool pair available, idTool stays NULL (GLOBAL tools will claim)
 *
 * Interval: 30 giây (configurable via TOOL_AUTO_ASSIGN_INTERVAL_MS)
 */
async function runToolAutoAssign(): Promise<void> {
  if (isRunning) {
    logger.warn('Tool auto-assign job is already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    logger.debug('Starting tool auto-assign job...');

    const result = await managerApi.autoAssignTools();

    const { assigned, skipped, details } = result.data;

    if (assigned > 0) {
      logger.info(`Tool auto-assign completed`, {
        assigned,
        skipped,
        details: details.map((d) => `${d.requestId} → ${d.idTool} (${d.priority})`),
      });
    } else {
      logger.debug('No requests to auto-assign tools');
    }
  } catch (error) {
    logger.error('Tool auto-assign job failed', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the tool auto-assign job
 * Runs at the configured interval (default: 30s)
 */
export function startToolAutoAssignJob(): NodeJS.Timeout {
  const intervalMs = config.toolAutoAssign.intervalMs;

  logger.info(`Starting Tool Auto-Assign Job`, {
    interval: `${intervalMs / 1000}s`,
    note: 'Auto-assigns idTool to unassigned NEW/PENDING requests based on tool pair availability and priority',
  });

  // Run immediately on start
  runToolAutoAssign();

  // Then run at interval
  return setInterval(runToolAutoAssign, intervalMs);
}

/**
 * Stop the tool auto-assign job
 */
export function stopToolAutoAssignJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Tool Auto-Assign Job stopped');
}
