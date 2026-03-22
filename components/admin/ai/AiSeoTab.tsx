/**
 * AI SEO Tab Component
 *
 * SEO analysis and suggestions.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { SeoSuggestion } from "./types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiSeoTabProps {
  loading: boolean;
  onAnalyze: () => void;
  seoAssessment: string;
  seoSuggestions: SeoSuggestion[];
}

export function AiSeoTab({
  loading,
  onAnalyze,
  seoAssessment,
  seoSuggestions,
}: AiSeoTabProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={onAnalyze}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            جارٍ التحليل...
          </span>
        ) : (
          "تحليل SEO بالذكاء الاصطناعي"
        )}
      </Button>

      {seoAssessment && (
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm font-medium text-foreground">التقييم العام:</p>
          <p className="text-sm text-muted-foreground mt-1">{seoAssessment}</p>
        </div>
      )}

      {seoSuggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">الاقتراحات:</p>
          {seoSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(
                    suggestion.priority
                  )}`}
                >
                  {suggestion.priority === "high"
                    ? "عالي"
                    : suggestion.priority === "medium"
                    ? "متوسط"
                    : "منخفض"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.type}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {suggestion.issue}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {suggestion.suggestion}
              </p>
              {suggestion.example && (
                <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                  مثال: {suggestion.example}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
