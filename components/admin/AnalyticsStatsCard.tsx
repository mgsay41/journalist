interface AnalyticsStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

export function AnalyticsStatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
}: AnalyticsStatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-zinc-500";
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-600 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-zinc-900">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${getChangeColor()}`}>{change}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-zinc-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
