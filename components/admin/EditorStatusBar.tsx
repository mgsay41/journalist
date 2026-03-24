'use client';

interface EditorStatusBarProps {
  seoScore: number;
  geoScore: number;
  structureScore: number;
  structureTotal: number;
  wordCount: number;
  grammarCount: number;
  onFocusSection: (section: 'issues' | 'meta' | 'taxonomy') => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export function EditorStatusBar({
  seoScore,
  geoScore,
  structureScore,
  structureTotal,
  wordCount,
  grammarCount,
  onFocusSection,
  onTogglePanel,
  panelOpen,
}: EditorStatusBarProps) {
  return (
    <div
      className="h-10 shrink-0 border-t border-border bg-card flex items-center justify-between px-4 text-sm"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => onFocusSection('issues')}
          className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors"
          title="SEO Score"
        >
          <span className={`w-2 h-2 rounded-full ${getScoreColor(seoScore)}`} />
          <span className="text-muted-foreground">SEO:</span>
          <span className={`font-medium ${getScoreTextColor(seoScore)}`}>{seoScore}</span>
        </button>

        <button
          onClick={() => onFocusSection('issues')}
          className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors"
          title="GEO Score"
        >
          <span className={`w-2 h-2 rounded-full ${getScoreColor(geoScore)}`} />
          <span className="text-muted-foreground">GEO:</span>
          <span className={`font-medium ${getScoreTextColor(geoScore)}`}>{geoScore}</span>
        </button>

        <button
          onClick={() => onFocusSection('issues')}
          className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors"
          title="Structure Score"
        >
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">هيكل:</span>
          <span className="font-medium text-foreground">{structureScore}/{structureTotal}</span>
        </button>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{wordCount}</span>
          <span className="text-xs">كلمة</span>
        </div>

        {grammarCount > 0 && (
          <button
            onClick={() => onFocusSection('issues')}
            className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors"
          >
            <span className="text-danger">⚠</span>
            <span className="text-danger font-medium">{grammarCount} أخطاء</span>
          </button>
        )}
      </div>

      <button
        onClick={onTogglePanel}
        className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors text-muted-foreground hover:text-foreground"
        title={panelOpen ? 'إغلاق اللوحة' : 'فتح اللوحة'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs">AI</span>
      </button>
    </div>
  );
}

export default EditorStatusBar;
