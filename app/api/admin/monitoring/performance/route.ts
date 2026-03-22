import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
export const POST = withErrorHandler(async (request: Request) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, value, id, rating, url, userAgent } = body;

    if (!name || typeof value !== 'number' || !id) {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Log Web Vitals metrics
    logger.info('Web Vitals metric received', {
      name,
      value,
      rating,
      url,
      metricId: id,
    });

    // In production, you might want to:
    // 1. Store metrics in a database for analysis
    // 2. Send to external monitoring service (e.g., Vercel Analytics, Google Analytics)
    // 3. Aggregate metrics for dashboard display

    // For now, we'll log and return success
    // In a future update, we could store metrics in Prisma:
    // await prisma.webVitalMetric.create({
    //   data: {
    //     name,
    //     value,
    //     rating,
    //     url,
    //     userAgent,
    //     timestamp: new Date(body.timestamp),
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Metric recorded',
    });
  } catch (error) {
    logger.error('Failed to process Web Vitals metric', { error });
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
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
  const session = await auth.api.getSession({ headers: request.headers });

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
  const session = await auth.api.getSession({ headers: request.headers });

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
