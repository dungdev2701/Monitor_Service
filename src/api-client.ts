import { config } from './config';
import { logger } from './logger';

interface MarkStaleDeadResponse {
  success: boolean;
  message: string;
  data: {
    markedCount: number;
    tools: Array<{
      id: string;
      idTool: string;
      lastUpdated: string;
      estimateTime: number;
    }>;
    estimateTimeUpdated: number;
  };
}

interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

interface ProcessAllocationResponse {
  success: boolean;
  message: string;
  data: {
    processed: number;
    skipped: number;
    failed: number;
  };
}

interface ReleaseExpiredResponse {
  success: boolean;
  message: string;
  data: {
    releasedCount: number;
  };
}

interface TimeoutRequestsResponse {
  success: boolean;
  message: string;
  data: {
    timedOut: number;
    cancelledItems: number;
  };
}

interface AutoAssignToolsResponse {
  success: boolean;
  message: string;
  data: {
    assigned: number;
    skipped: number;
    details: Array<{
      requestId: string;
      idTool: string;
      priority: string;
      auctionPrice: string | null;
    }>;
  };
}

interface ReAllocateResponse {
  success: boolean;
  message: string;
  data: {
    processed: number;
    skipped: number;
    details: Array<{
      requestId: string;
      deficit: number;
      allocated: number;
    }>;
  };
}

interface TriggerStackingResponse {
  success: boolean;
  message: string;
  data: {
    triggered: number;
    updatedItems: number;
    details: Array<{
      requestId: string;
      entityConnect: string;
      threshold: number;
      linkProfileCount: number;
    }>;
  };
}

/**
 * API Client for Manager Site API
 */
export class ManagerApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.managerApiUrl;
    this.apiKey = config.monitorApiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    // Only set Content-Type and body if there's actual data to send
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check health of Manager Site API
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('GET', '/api/public/monitor/health');
  }

  /**
   * Mark stale tools as dead
   * Uses each tool's estimateTime to determine staleness
   */
  async markStaleToolsAsDead(): Promise<MarkStaleDeadResponse> {
    return this.request<MarkStaleDeadResponse>('POST', '/api/public/monitor/mark-stale-dead');
  }

  /**
   * Process NEW requests - allocate websites to service requests
   * This triggers the allocation service to:
   * 1. Find NEW service requests
   * 2. Allocate available websites to each request
   * 3. Create allocation items for tools to claim
   */
  async processAllocation(serviceType?: string): Promise<ProcessAllocationResponse> {
    const endpoint = serviceType
      ? `/api/public/allocation-tasks/process?serviceType=${serviceType}`
      : '/api/public/allocation-tasks/process';
    return this.request<ProcessAllocationResponse>('POST', endpoint);
  }

  /**
   * Release expired claims
   * Claims that exceed their timeout will be released back to PENDING
   * so other tools can claim them
   */
  async releaseExpiredClaims(): Promise<ReleaseExpiredResponse> {
    return this.request<ReleaseExpiredResponse>('POST', '/api/public/allocation-tasks/release-expired');
  }

  /**
   * Timeout expired requests
   * Requests that exceeded their completion time will be marked as COMPLETED
   * and their pending items will be cancelled
   *
   * Timeout calculation:
   * - entityLimit >= 100: timeout = (entityLimit / 100) * REQUEST_COMPLETION_TIME_PER_100
   * - entityLimit < 100: timeout = 30 minutes (fixed)
   */
  async timeoutExpiredRequests(): Promise<TimeoutRequestsResponse> {
    return this.request<TimeoutRequestsResponse>('POST', '/api/public/allocation-tasks/timeout-requests');
  }

  /**
   * Trigger stacking for requests that have reached their threshold
   *
   * Checks requests with entityConnect = 'all' or 'limit':
   * - 'all': linkProfile count >= entityLimit → trigger stacking
   * - 'limit': linkProfile count >= limit value → trigger stacking
   *
   * When threshold is met, sets stackingReady=true for CONNECTING tasks
   * so tools can claim them for stacking phase.
   */
  async triggerStackingForReadyRequests(): Promise<TriggerStackingResponse> {
    return this.request<TriggerStackingResponse>('POST', '/api/public/allocation-tasks/trigger-stacking');
  }

  /**
   * Re-allocate websites for active requests that need more items
   * When all items are processed but results are not enough
   */
  async reAllocate(): Promise<ReAllocateResponse> {
    return this.request<ReAllocateResponse>('POST', '/api/public/allocation-tasks/re-allocate');
  }

  /**
   * Auto-assign idTool to NEW/PENDING requests
   *
   * Assigns tool pairs to requests based on:
   * - customerType matching (priority tools → HIGH/URGENT requests)
   * - auctionPrice ordering (higher price first within same group)
   * - Round-robin distribution across available tool pairs
   */
  async autoAssignTools(): Promise<AutoAssignToolsResponse> {
    return this.request<AutoAssignToolsResponse>('POST', '/api/public/allocation-tasks/auto-assign-tools');
  }
}

export const managerApi = new ManagerApiClient();
