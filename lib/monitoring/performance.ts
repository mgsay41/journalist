/**
 * Performance Monitoring Utility
 *
 * Phase 2 Backend Audit - Performance Monitoring System
 *
 * Tracks:
 * - API endpoint response times
 * - Database query performance
 * - Cache effectiveness
 * - Memory usage
 * - Request throughput
 */

import { logger } from './logger';
import { getCacheStats } from '@/lib/cache';

/**
 * Performance metrics storage
 */
interface PerformanceMetrics {
  requests: {
    total: number;
    byEndpoint: Map<string, RequestMetrics>;
    byStatus: Map<number, number>;
    byMethod: Map<string, number>;
  };
  database: {
    totalQueries: number;
    slowQueries: number;
    avgQueryTime: number;
    byTable: Map<string, DatabaseMetrics>;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  system: {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    responseTimes: number[];
  };
}

interface RequestMetrics {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
  statusCodes: Map<number, number>;
}

interface DatabaseMetrics {
  count: number;
  totalTime: number;
  slowQueries: number;
  avgTime: number;
}

// Global metrics storage
const metrics: PerformanceMetrics = {
  requests: {
    total: 0,
    byEndpoint: new Map(),
    byStatus: new Map(),
    byMethod: new Map(),
  },
  database: {
    totalQueries: 0,
    slowQueries: 0,
    avgQueryTime: 0,
    byTable: new Map(),
  },
  cache: {
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
  },
  system: {
    avgResponseTime: 0,
    p50ResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    maxResponseTime: 0,
    responseTimes: [],
  },
};

// Configuration
const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const MAX_RESPONSE_TIMES = 1000; // Keep last 1000 response times for percentiles
const MONITORING_ENABLED = process.env.NODE_ENV !== 'test';

/**
 * Record API request metrics
 */
export function recordRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  if (!MONITORING_ENABLED) return;

  metrics.requests.total++;

  // Track by endpoint
  let endpointMetrics = metrics.requests.byEndpoint.get(endpoint);
  if (!endpointMetrics) {
    endpointMetrics = {
      count: 0,
      totalTime: 0,
      minTime: duration,
      maxTime: duration,
      errors: 0,
      statusCodes: new Map(),
    };
    metrics.requests.byEndpoint.set(endpoint, endpointMetrics);
  }

  endpointMetrics.count++;
  endpointMetrics.totalTime += duration;
  endpointMetrics.minTime = Math.min(endpointMetrics.minTime, duration);
  endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, duration);

  if (statusCode >= 400) {
    endpointMetrics.errors++;
  }

  // Track status code
  const statusCount = endpointMetrics.statusCodes.get(statusCode) || 0;
  endpointMetrics.statusCodes.set(statusCode, statusCount + 1);

  // Track by status
  const statusTotal = metrics.requests.byStatus.get(statusCode) || 0;
  metrics.requests.byStatus.set(statusCode, statusTotal + 1);

  // Track by method
  const methodTotal = metrics.requests.byMethod.get(method) || 0;
  metrics.requests.byMethod.set(method, methodTotal + 1);

  // Update system response times
  metrics.system.responseTimes.push(duration);
  if (metrics.system.responseTimes.length > MAX_RESPONSE_TIMES) {
    metrics.system.responseTimes.shift();
  }

  updateResponseTimePercentiles();

  // Log slow requests
  if (duration > 5000) {
    logger.warn('Slow request detected', {
      endpoint,
      method,
      statusCode,
      duration,
    });
  }
}

/**
 * Record database query metrics
 */
export function recordQuery(
  table: string,
  operation: string,
  duration: number,
  rowCount?: number
): void {
  if (!MONITORING_ENABLED) return;

  metrics.database.totalQueries++;

  const isSlow = duration > SLOW_QUERY_THRESHOLD;
  if (isSlow) {
    metrics.database.slowQueries++;
    logger.warn('Slow database query', {
      table,
      operation,
      duration,
      rowCount,
    });
  }

  // Track by table
  let tableMetrics = metrics.database.byTable.get(table);
  if (!tableMetrics) {
    tableMetrics = {
      count: 0,
      totalTime: 0,
      slowQueries: 0,
      avgTime: 0,
    };
    metrics.database.byTable.set(table, tableMetrics);
  }

  tableMetrics.count++;
  tableMetrics.totalTime += duration;
  tableMetrics.avgTime = tableMetrics.totalTime / tableMetrics.count;

  if (isSlow) {
    tableMetrics.slowQueries++;
  }

  // Update global average
  metrics.database.avgQueryTime =
    metrics.database.avgQueryTime +
    (duration - metrics.database.avgQueryTime) / metrics.database.totalQueries;
}

/**
 * Update cache metrics from cache system
 */
export function updateCacheMetrics(): void {
  if (!MONITORING_ENABLED) return;

  const cacheStats = getCacheStats();
  metrics.cache.hitRate = cacheStats.hitRate;
  metrics.cache.totalHits = cacheStats.hits;
  metrics.cache.totalMisses = cacheStats.misses;
}

/**
 * Calculate response time percentiles
 */
function updateResponseTimePercentiles(): void {
  const times = [...metrics.system.responseTimes].sort((a, b) => a - b);
  const len = times.length;

  if (len === 0) return;

  metrics.system.avgResponseTime =
    times.reduce((sum, t) => sum + t, 0) / len;
  metrics.system.maxResponseTime = times[len - 1];

  const p50Index = Math.floor(len * 0.5);
  const p95Index = Math.floor(len * 0.95);
  const p99Index = Math.floor(len * 0.99);

  metrics.system.p50ResponseTime = times[p50Index];
  metrics.system.p95ResponseTime = times[p95Index];
  metrics.system.p99ResponseTime = times[p99Index];
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    slowQueryRate: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    avgTime: number;
    maxTime: number;
    errorRate: number;
  }>;
  slowQueries: Array<{
    table: string;
    count: number;
    avgTime: number;
    slowQueries: number;
  }>;
  recommendations: string[];
} {
  const totalRequests = metrics.requests.total;
  const totalErrors = Array.from(metrics.requests.byStatus.values())
    .filter((status) => status >= 400)
    .reduce((sum, count) => sum + count, 0);
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  const slowQueryRate =
    metrics.database.totalQueries > 0
      ? (metrics.database.slowQueries / metrics.database.totalQueries) * 100
      : 0;

  // Get top endpoints by request count
  const topEndpoints = Array.from(metrics.requests.byEndpoint.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgTime: data.totalTime / data.count,
      maxTime: data.maxTime,
      errorRate: (data.errors / data.count) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get slow query tables
  const slowQueries = Array.from(metrics.database.byTable.entries())
    .map(([table, data]) => ({
      table,
      count: data.count,
      avgTime: data.avgTime,
      slowQueries: data.slowQueries,
    }))
    .filter((q) => q.slowQueries > 0)
    .sort((a, b) => b.slowQueries - a.slowQueries);

  // Generate recommendations
  const recommendations: string[] = [];

  if (errorRate > 5) {
    recommendations.push(
      `High error rate detected (${errorRate.toFixed(2)}%). Review error logs and fix failing endpoints.`
    );
  }

  if (metrics.system.p95ResponseTime > 2000) {
    recommendations.push(
      `95th percentile response time is ${metrics.system.p95ResponseTime}ms. Consider optimizing slow endpoints.`
    );
  }

  if (metrics.cache.hitRate < 60) {
    recommendations.push(
      `Cache hit rate is ${(metrics.cache.hitRate).toFixed(2)}%. Consider increasing cache TTL or optimizing cache keys.`
    );
  }

  if (slowQueryRate > 5) {
    recommendations.push(
      `${slowQueryRate.toFixed(2)}% of queries are slow. Review database indexes and query patterns.`
    );
  }

  if (topEndpoints.some((e) => e.avgTime > 1000)) {
    recommendations.push(
      'Some endpoints have average response times over 1 second. Consider implementing caching or query optimization.'
    );
  }

  return {
    summary: {
      totalRequests,
      avgResponseTime: metrics.system.avgResponseTime,
      p95ResponseTime: metrics.system.p95ResponseTime,
      p99ResponseTime: metrics.system.p99ResponseTime,
      errorRate,
      cacheHitRate: metrics.cache.hitRate,
      slowQueryRate,
    },
    topEndpoints,
    slowQueries,
    recommendations,
  };
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  metrics.requests.total = 0;
  metrics.requests.byEndpoint.clear();
  metrics.requests.byStatus.clear();
  metrics.requests.byMethod.clear();

  metrics.database.totalQueries = 0;
  metrics.database.slowQueries = 0;
  metrics.database.avgQueryTime = 0;
  metrics.database.byTable.clear();

  metrics.cache.hitRate = 0;
  metrics.cache.totalHits = 0;
  metrics.cache.totalMisses = 0;

  metrics.system.avgResponseTime = 0;
  metrics.system.p50ResponseTime = 0;
  metrics.system.p95ResponseTime = 0;
  metrics.system.p99ResponseTime = 0;
  metrics.system.maxResponseTime = 0;
  metrics.system.responseTimes = [];
}

/**
 * Performance tracking middleware for API routes
 */
export class PerformanceTracker {
  private startTime: number;
  private endpoint: string;
  private method: string;

  constructor(endpoint: string, method: string) {
    this.startTime = Date.now();
    this.endpoint = endpoint;
    this.method = method;
  }

  /**
   * End tracking and record metrics
   */
  end(statusCode: number): void {
    const duration = Date.now() - this.startTime;
    recordRequest(this.endpoint, this.method, statusCode, duration);
  }

  /**
   * Get current duration without ending tracking
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Decorator for tracking async function performance
 */
export function trackPerformance<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      logger.debug(`${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`${name} failed after ${duration}ms`, { error });
      throw error;
    }
  }) as T;
}

/**
 * Get memory usage statistics
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
  unit: string;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percentage = (used / total) * 100;

    return {
      used: Math.round(used / 1024 / 1024),
      total: Math.round(total / 1024 / 1024),
      percentage: Math.round(percentage * 100) / 100,
      unit: 'MB',
    };
  }

  return {
    used: 0,
    total: 0,
    percentage: 0,
    unit: 'MB',
  };
}
