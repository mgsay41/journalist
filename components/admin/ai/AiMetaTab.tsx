/**
 * AI Meta Tab Component
 *
 * Meta title and description generation.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

import { MetaTitleSuggestion, MetaDescriptionSuggestion } from "./types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiMetaTabProps {
  loading: boolean;
  onGenerateTitles: () => void;
  onGenerateDescriptions: () => void;
  onTitleSelect: (title: string) => void;
  onDescriptionSelect: (description: string) => void;
  metaTitles: MetaTitleSuggestion[];
  metaDescriptions: MetaDescriptionSuggestion[];
}

export function AiMetaTab({
  loading,
  onGenerateTitles,
  onGenerateDescriptions,
  onTitleSelect,
  onDescriptionSelect,
  metaTitles,
  metaDescriptions,
}: AiMetaTabProps) {
  return (
    <div className="space-y-6">
      {/* Meta Title */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">عنوان الميتا</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateTitles}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "توليد"}
          </Button>
        </div>

        {metaTitles.length > 0 && (
          <div className="space-y-2">
            {metaTitles.map((item, index) => (
              <div
                key={index}
                className="border border-border rounded-md p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onTitleSelect(item.title)}
              >
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.length} حرف • {item.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meta Description */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">وصف الميتا</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateDescriptions}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "توليد"}
          </Button>
        </div>

        {metaDescriptions.length > 0 && (
          <div className="space-y-2">
            {metaDescriptions.map((item, index) => (
              <div
                key={index}
                className="border border-border rounded-md p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onDescriptionSelect(item.description)}
              >
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.length} حرف • {item.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
