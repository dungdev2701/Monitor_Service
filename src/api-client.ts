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
}

export const managerApi = new ManagerApiClient();
