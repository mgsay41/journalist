/**
 * AI Keywords Tab Component
 *
 * Keyword extraction and recommendations.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { ExtractedKeyword } from "./types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiKeywordsTabProps {
  loading: boolean;
  onExtract: () => void;
  onKeywordSelect: (keyword: string) => void;
  keywords: ExtractedKeyword[];
  recommendedKeyword: string;
}

export function AiKeywordsTab({
  loading,
  onExtract,
  onKeywordSelect,
  keywords,
  recommendedKeyword,
}: AiKeywordsTabProps) {
  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={onExtract}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            جارٍ الاستخراج...
          </span>
        ) : (
          "استخراج الكلمات المفتاحية"
        )}
      </Button>

      {recommendedKeyword && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <p className="text-sm font-medium text-success">
            الكلمة المفتاحية المقترحة:
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-success font-semibold">
              {recommendedKeyword}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onKeywordSelect(recommendedKeyword)}
            >
              استخدام
            </Button>
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            الكلمات المستخرجة:
          </p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, index) => (
              <button
                key={index}
                onClick={() => onKeywordSelect(kw.keyword)}
                className={`text-sm px-3 py-1 rounded-full ${getRelevanceColor(
                  kw.relevance
                )} hover:opacity-80 transition-opacity`}
              >
                {kw.keyword}
                <span className="text-xs opacity-70 mr-1">
                  ({kw.density.toFixed(1)}%)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
