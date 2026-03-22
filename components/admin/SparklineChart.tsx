'use client';

import { memo } from 'react';

/**
 * SparklineChart - A mini chart component for visualizing trends
 * Shows a simple line chart with optional fill and data points
 */

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showFill?: boolean;
  showDots?: boolean;
  className?: string;
}

function SparklineChartComponent({
  data,
  width = 100,
  height = 30,
  strokeWidth = 2,
  color = 'currentColor',
  showFill = true,
  showDots = false,
  className = '',
}: SparklineChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="w-full h-0.5 bg-muted rounded" />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create points for the SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const fillPath = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Determine trend direction
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendDirection = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'neutral';

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`gradient-${color.replace(/[^\w]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showFill && (
        <path
          d={fillPath}
          fill={`url(#gradient-${color.replace(/[^\w]/g, '')})`}
          stroke="none"
        />
      )}

      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {showDots && points.map((point, i) => (
        <circle
          key={i}
          cx={parseFloat(point.split(',')[0])}
          cy={parseFloat(point.split(',')[1])}
          r={strokeWidth * 1.5}
          fill={color}
        />
      ))}
    </svg>
  );
}

// Custom comparison function - only re-render if data or visual config changes
function arePropsEqual(
  prevProps: SparklineChartProps,
  nextProps: SparklineChartProps
): boolean {
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((val, i) => val === nextProps.data[i]) &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.strokeWidth === nextProps.strokeWidth &&
    prevProps.color === nextProps.color &&
    prevProps.showFill === nextProps.showFill &&
    prevProps.showDots === nextProps.showDots &&
    prevProps.className === nextProps.className
  );
}

export const SparklineChart = memo(SparklineChartComponent, arePropsEqual);

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
