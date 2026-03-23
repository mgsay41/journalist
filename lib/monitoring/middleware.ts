/**
 * Performance Monitoring Middleware
 *
 * Phase 2 Backend Audit - API Performance Tracking
 *
 * Provides wrapper functions to automatically track API performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceTracker } from '@/lib/monitoring/performance';
import { logger } from '@/lib/monitoring/logger';
import { generateRequestId } from '@/lib/monitoring/logger';

/**
 * Wrap an API route handler with performance tracking
 *
 * @param handler - The route handler function
 * @returns Wrapped handler with performance tracking
 */
export function withPerformanceTracking<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    const request = args[0] as NextRequest;
    const requestId = generateRequestId();

    // Add request ID to headers for logging
    const requestWithId = new Request(request.url, {
      ...request,
      headers: new Headers(request.headers),
    });
    requestWithId.headers.set('x-request-id', requestId);

    // Create performance tracker
    const pathname = new URL(request.url).pathname;
    const tracker = new PerformanceTracker(pathname, request.method);

    // Log request start
    logger.info(`Request started: ${request.method} ${pathname}`, {
      requestId,
      method: request.method,
      pathname,
    });

    try {
      // Execute handler
      const response = await handler(...args);

      // Record performance metrics
      tracker.end(response.status);

      // Log request completion
      logger.info(`Request completed: ${request.method} ${pathname}`, {
        requestId,
        method: request.method,
        pathname,
        statusCode: response.status,
        duration: tracker.getDuration(),
      });

      // Add performance headers to response
      const responseWithHeaders = new NextResponse(response.body, response);
      responseWithHeaders.headers.set('x-request-id', requestId);
      responseWithHeaders.headers.set('x-response-time', `${tracker.getDuration()}`);

      return responseWithHeaders;
    } catch (error) {
      // Record error metrics
      tracker.end(500);

      // Log error
      logger.error(`Request failed: ${request.method} ${pathname}`, {
        requestId,
        method: request.method,
        pathname,
        error: error instanceof Error ? error.message : String(error),
        duration: tracker.getDuration(),
      });

      throw error;
    }
  };
}

/**
 * Combine error handling and performance tracking
 *
 * @param handler - The route handler function
 * @returns Wrapped handler with both error handling and performance tracking
 */
export function withMonitoring<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return withPerformanceTracking(handler);
}
