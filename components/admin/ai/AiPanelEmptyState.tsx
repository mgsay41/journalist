/**
 * AI Panel Empty State Component
 *
 * Displayed when there's not enough content to analyze.
 * Phase 2 Frontend Audit - Split from AiPanel
 */

export function AiPanelEmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl">✨</span>
      </div>
      <p>أضف عنواناً ومحتوى للمقال لتفعيل ميزات الذكاء الاصطناعي</p>
    </div>
  );
}
