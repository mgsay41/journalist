import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPerformanceReport, getMemoryUsage, updateCacheMetrics, resetMetrics } from '@/lib/monitoring/performance';
import { withErrorHandler } from '@/lib/errors/handler';
import { logger } from '@/lib/monitoring/logger';

/**
 * POST /api/admin/monitoring/performance
 *
 * Receive Web Vitals metrics from client-side
 * Phase 3 Frontend Audit - Web Vitals Monitoring
 */
interface MetricPayload {
  name: string;
  value: number;
  id: string;
  rating?: string;
  url?: string;
  navigationType?: string;
  timestamp?: number;
}

function isValidMetric(m: unknown): m is MetricPayload {
  if (!m || typeof m !== 'object') return false;
  const metric = m as Record<string, unknown>;
  return typeof metric.name === 'string' && typeof metric.value === 'number' && typeof metric.id === 'string';
}

export const POST = withErrorHandler(async (request: Request) => {
  try {
    const body = await request.json();

    // Accept both a single metric { name, value, id, ... }
    // and a batched payload { metrics: [...] } from the client-side queue
    const metrics: MetricPayload[] = Array.isArray(body.metrics) ? body.metrics : [body];

    const valid = metrics.filter(isValidMetric);
    if (valid.length === 0) {
      return NextResponse.json({ error: 'Invalid metric data' }, { status: 400 });
    }

    for (const metric of valid) {
      logger.info('Web Vitals metric received', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: metric.url,
        metricId: metric.id,
      });
    }

    return NextResponse.json({ success: true, received: valid.length });
  } catch (error) {
    logger.error('Failed to process Web Vitals metric', { error });
    return NextResponse.json({ error: 'Failed to process metric' }, { status: 500 });
  }
});

/**
 * GET /api/admin/monitoring/performance
 *
 * Get performance monitoring data (admin only)
 * Phase 2 Backend Audit - Performance Monitoring API
 */
export const GET = withErrorHandler(async (request: Request) => {
  // Verify admin session
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Update cache metrics before generating report
  updateCacheMetrics();

  // Get performance report
  const performanceReport = getPerformanceReport();

  // Get memory usage
  const memoryUsage = getMemoryUsage();

  // Get database connection pool stats (if available)
  const dbStats = {
    // Prisma doesn't expose connection pool stats directly
    // These would need to be added via custom middleware
    connections: 'N/A',
    activeConnections: 'N/A',
  };

  return NextResponse.json({
    performance: performanceReport,
    memory: memoryUsage,
    database: dbStats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/admin/monitoring/performance
 *
 * Reset performance metrics (admin only)
 */
export const DELETE = withErrorHandler(async (request: Request) => {
  // Verify admin session
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  resetMetrics();

  return NextResponse.json({
    success: true,
    message: 'Performance metrics reset successfully',
  });
});
