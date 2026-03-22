/**
 * AI Grammar Tab Component
 *
 * Grammar checking and text correction.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { GrammarError } from "./types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiGrammarTabProps {
  loading: boolean;
  onCheck: () => void;
  onApplyCorrections: (text: string) => void;
  grammarErrors: GrammarError[];
  correctedText: string;
  grammarQuality: string;
}

export function AiGrammarTab({
  loading,
  onCheck,
  onApplyCorrections,
  grammarErrors,
  correctedText,
  grammarQuality,
}: AiGrammarTabProps) {
  return (
    <div className="space-y-4">
      <Button
        onClick={onCheck}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            جارٍ التدقيق...
          </span>
        ) : (
          "تدقيق لغوي وإملائي"
        )}
      </Button>

      {grammarQuality && (
        <div
          className={`p-3 rounded-lg ${
            grammarQuality === "excellent"
              ? "bg-success/10 border border-success/20"
              : grammarQuality === "good"
              ? "bg-warning/10 border border-warning/20"
              : "bg-danger/10 border border-danger/20"
          }`}
        >
          <p className={`text-sm font-medium ${
            grammarQuality === "excellent"
              ? "text-success"
              : grammarQuality === "good"
              ? "text-warning"
              : "text-danger"
          }`}>
            جودة النص:{" "}
            {grammarQuality === "excellent"
              ? "ممتازة ✓"
              : grammarQuality === "good"
              ? "جيدة"
              : "تحتاج تحسين"}
          </p>
        </div>
      )}

      {grammarErrors.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            الأخطاء المكتشفة ({grammarErrors.length}):
          </p>
          {grammarErrors.map((error, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-danger/10 text-danger">
                  {error.type === "spelling"
                    ? "إملائي"
                    : error.type === "grammar"
                    ? "نحوي"
                    : error.type === "punctuation"
                    ? "ترقيم"
                    : "أسلوبي"}
                </span>
              </div>
              <p className="text-sm">
                <span className="line-through text-danger">
                  {error.original}
                </span>
                <span className="mx-2 text-muted-foreground">←</span>
                <span className="text-success font-medium">
                  {error.correction}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {correctedText && grammarErrors.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              النص المصحح:
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApplyCorrections(correctedText)}
            >
              تطبيق التصحيحات
            </Button>
          </div>
        </div>
      )}

      {grammarQuality === "excellent" && grammarErrors.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p>لم يتم العثور على أخطاء لغوية</p>
        </div>
      )}
    </div>
  );
}
