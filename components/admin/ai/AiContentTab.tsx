/**
 * AI Content Tab Component
 *
 * Introduction and conclusion generation.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiContentTabProps {
  loading: boolean;
  onGenerateIntro: () => void;
  onGenerateConclusion: () => void;
  onInsertIntro: (text: string) => void;
  onInsertConclusion: (text: string) => void;
  generatedIntro: string;
  generatedConclusion: string;
}

export function AiContentTab({
  loading,
  onGenerateIntro,
  onGenerateConclusion,
  onInsertIntro,
  onInsertConclusion,
  generatedIntro,
  generatedConclusion,
}: AiContentTabProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">توليد مقدمة</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateIntro}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "توليد"}
          </Button>
        </div>

        {generatedIntro && (
          <div className="border border-border rounded-lg p-3">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {generatedIntro}
            </p>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onInsertIntro(generatedIntro)}
              >
                إضافة في البداية
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(generatedIntro);
                }}
              >
                نسخ
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conclusion */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">توليد خاتمة</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateConclusion}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "توليد"}
          </Button>
        </div>

        {generatedConclusion && (
          <div className="border border-border rounded-lg p-3">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {generatedConclusion}
            </p>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onInsertConclusion(generatedConclusion)}
              >
                إضافة في النهاية
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(generatedConclusion);
                }}
              >
                نسخ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
