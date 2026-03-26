'use client';

/**
 * Web Vitals Component
 *
 * Phase 3 Frontend Audit - Web Vitals Monitoring
 *
 * Tracks Core Web Vitals:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity (replaced by INP)
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Loading performance
 * - TTFB (Time to First Byte) - Server response time
 * - INP (Interaction to Next Paint) - Interactivity
 */

import { useEffect } from 'react';
import {
  onCLS,
  onFCP,
  onLCP,
  onTTFB,
  onINP,
  type Metric,
} from 'web-vitals';

interface WebVitalsProps {
  /**
   * Callback function to receive metrics
   * Can be used to send to analytics service
   */
  onMetric?: (metric: Metric) => void;

  /**
   * Enable console logging for development
   */
  debug?: boolean;
}

/**
 * Web Vitals ratings based on thresholds
 */
function getMetricRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const { name, value } = metric;

  // Type assertion needed because web-vitals v4 uses specific metric name types
  const metricName = name as string;

  switch (metricName) {
    case 'CLS':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';

    case 'INP':
      if (value <= 100) return 'good';
      if (value <= 300) return 'needs-improvement';
      return 'poor';

    case 'LCP':
    case 'FCP':
    case 'TTFB':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';

    default:
      return 'good';
  }
}

/**
 * Log metric to console in development
 */
function logMetric(metric: Metric, rating: string): void {
  const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';

  console.log(
    `[Web Vitals] ${emoji} ${metric.name}:`,
    `${metric.value.toFixed(2)} ${getMetricUnit(metric.name)} (${rating})`,
    {
      id: metric.id,
      navigationType: metric.navigationType,
      rating,
    }
  );
}

/**
 * Get unit for metric display
 */
function getMetricUnit(name: string): string {
  const metricName = name as string;

  switch (metricName) {
    case 'CLS':
      return 'score';
    case 'TTFB':
    case 'LCP':
    case 'FCP':
    case 'FID':
    case 'INP':
      return 'ms';
    default:
      return '';
  }
}

// ── Batched metric queue ────────────────────────────────────────────────────
// Module-level so the queue survives React re-renders and component remounts.
// Metrics are queued and flushed either:
//   • when the page becomes hidden (visibilitychange → hidden), or
//   • after 10 seconds of inactivity (trailing timer)
// Both paths use sendBeacon (non-blocking, survives page navigation) with
// a fetch+keepalive fallback for browsers that lack sendBeacon.

interface MetricPayload {
  name: string;
  value: number;
  id: string;
  rating: string;
  navigationType: string | undefined;
  timestamp: number;
  url: string;
}

const metricQueue: MetricPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityListenerAdded = false;

function flushQueue() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (metricQueue.length === 0) return;

  const batch = metricQueue.splice(0); // drain in-place
  const body = JSON.stringify({ metrics: batch });

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // sendBeacon requires a Blob to set Content-Type
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/admin/monitoring/performance', blob);
    } else {
      fetch('/api/admin/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silently fail — never affect the user
  }
}

const MAX_QUEUE_SIZE = 20;

function queueMetric(payload: MetricPayload) {
  // Flush immediately if queue is full to prevent unbounded memory growth
  if (metricQueue.length >= MAX_QUEUE_SIZE) flushQueue();
  metricQueue.push(payload);
  // Reschedule the trailing flush
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushQueue, 10_000);
}

function ensureVisibilityListener() {
  if (visibilityListenerAdded || typeof document === 'undefined') return;
  visibilityListenerAdded = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue();
  });
}

function sendToAnalytics(metric: Metric) {
  const rating = getMetricRating(metric);
  ensureVisibilityListener();
  queueMetric({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Web Vitals Component
 *
 * Usage:
 * ```tsx
 * <WebVitals debug={process.env.NODE_ENV === 'development'} />
 * ```
 */
export function WebVitals({ onMetric, debug = false }: WebVitalsProps) {
  useEffect(() => {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') return;

    const handleMetric = (metric: Metric) => {
      const rating = getMetricRating(metric);

      // Log in development/debug mode
      if (debug || process.env.NODE_ENV === 'development') {
        logMetric(metric, rating);
      }

      // Call custom callback if provided
      if (onMetric) {
        onMetric(metric);
      }

      // Send to analytics
      sendToAnalytics(metric);
    };

    // Subscribe to all Core Web Vitals
    // web-vitals v4 handles automatic disconnection
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  }, [onMetric, debug]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to manually report a metric
 * Useful for custom metrics
 */
export function reportWebVital(metric: Metric): void {
  const rating = getMetricRating(metric);
  logMetric(metric, rating);
  sendToAnalytics(metric);
}

/**
 * Get Web Vitals summary for display
 */
export interface WebVitalsSummary {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
  overallRating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Helper function to rate overall performance
 */
export function getOverallRating(metrics: Partial<WebVitalsSummary>): 'good' | 'needs-improvement' | 'poor' {
  const values = Object.values(metrics).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 'good';

  let poorCount = 0;
  let needsImprovementCount = 0;

  if (metrics.cls) {
    if (metrics.cls > 0.25) poorCount++;
    else if (metrics.cls > 0.1) needsImprovementCount++;
  }

  if (metrics.lcp) {
    if (metrics.lcp > 3000) poorCount++;
    else if (metrics.lcp > 1800) needsImprovementCount++;
  }

  if (metrics.fid || metrics.inp) {
    const value = metrics.inp ?? metrics.fid;
    if (value && value > 300) poorCount++;
    else if (value && value > 100) needsImprovementCount++;
  }

  if (poorCount > 0) return 'poor';
  if (needsImprovementCount > 0) return 'needs-improvement';
  return 'good';
}

export default WebVitals;
