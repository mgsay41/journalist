'use client';

import { Card } from '@/components/ui/Card';

interface SeoScoreCardProps {
  score: number;
  status: 'good' | 'needs-improvement' | 'poor';
  topIssues: string[];
  onViewDetails?: () => void;
}

export function SeoScoreCard({
  score,
  status,
  topIssues,
  onViewDetails,
}: SeoScoreCardProps) {
  const getScoreColor = () => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBackground = () => {
    if (score >= 70) return 'bg-success/10';
    if (score >= 50) return 'bg-warning/10';
    return 'bg-danger/10';
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'good':
        return 'جيد - جاهز للنشر';
      case 'needs-improvement':
        return 'يحتاج تحسين';
      case 'poor':
        return 'ضعيف';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return (
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'needs-improvement':
        return (
          <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'poor':
        return (
          <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <Card className={`overflow-hidden ${getScoreBackground()}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            تحليل SEO
          </h3>
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-6 mb-4">
          {/* Circle Score */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'}
                strokeWidth="3"
                strokeDasharray={`${score}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>
                {score}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon()}
              <span className={`text-lg font-semibold ${getScoreColor()}`}>
                {getStatusLabel()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {score >= 70
                ? 'المقال محسّن بشكل جيد لمحركات البحث'
                : score >= 50
                ? 'يمكن تحسين ترتيب المقال في محركات البحث'
                : 'يحتاج المقال لتحسينات كبيرة في SEO'}
            </p>
          </div>
        </div>

        {/* Top Issues */}
        {topIssues.length > 0 && (
          <div className="border-t border-border/50 pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">أهم التحسينات:</h4>
            <ul className="space-y-2">
              {topIssues.slice(0, 3).map((issue, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-warning" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
          >
            عرض التفاصيل
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}

export default SeoScoreCard;
