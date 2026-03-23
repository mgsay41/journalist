import { memo } from 'react';

interface AnalyticsStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

function AnalyticsStatsCardComponent({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
}: AnalyticsStatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-success";
      case "negative":
        return "text-danger";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${getChangeColor()}`}>{change}</p>
          )}
        </div>
        {icon && (
          <div className="ms-4 text-muted-foreground/40">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Custom comparison function - only re-render if values actually change
function arePropsEqual(
  prevProps: AnalyticsStatsCardProps,
  nextProps: AnalyticsStatsCardProps
): boolean {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.changeType === nextProps.changeType
  );
}

export const AnalyticsStatsCard = memo(AnalyticsStatsCardComponent, arePropsEqual);
