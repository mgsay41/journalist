/**
 * Trend Color Utilities
 * Helper functions for determining colors based on trend direction
 * These are pure functions that can be used in both server and client components
 */

/**
 * Get trend color class based on direction
 */
export function getTrendColor(
  direction: 'up' | 'down' | 'neutral',
  positiveIsGood: boolean = true
): string {
  if (direction === 'neutral') return 'text-muted-foreground';

  if (positiveIsGood) {
    return direction === 'up' ? 'text-success' : 'text-danger';
  } else {
    return direction === 'up' ? 'text-danger' : 'text-success';
  }
}

/**
 * Get trend fill color for charts
 */
export function getTrendFillColor(
  direction: 'up' | 'down' | 'neutral',
  positiveIsGood: boolean = true
): string {
  if (direction === 'neutral') return '#94a3b8'; // muted-foreground

  if (positiveIsGood) {
    return direction === 'up' ? '#10b981' : '#ef4444'; // success : danger
  } else {
    return direction === 'up' ? '#ef4444' : '#10b981'; // danger : success
  }
}
