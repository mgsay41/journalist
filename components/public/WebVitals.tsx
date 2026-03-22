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

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: Metric) {
  const rating = getMetricRating(metric);

  // Send to internal analytics endpoint
  try {
    await fetch('/api/admin/monitoring/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        rating,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      // Use keepalive for better reliability during page unload
      keepalive: true,
    });
  } catch (error) {
    // Silently fail to not affect user experience
    console.debug('[Web Vitals] Failed to send metric:', error);
  }
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
