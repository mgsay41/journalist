'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ContentAnalysis {
  hasStrongIntro: boolean;
  hasConclusion: boolean;
  suggestedIntro: string | null;
  suggestedConclusion: string | null;
  tone: 'formal' | 'professional' | 'casual';
  targetAudience: string;
}

interface GrammarIssue {
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  original: string;
  correction: string;
  explanation: string;
}

interface SeoSuggestion {
  type: 'keyword-intro' | 'keyword-heading' | 'internal-link' | 'external-link' | 'paragraph-length' | 'image-alt';
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  autoFixable?: boolean;
  fixData?: {
    action: string;
    value: string;
  };
}

interface ContentImprovementCardProps {
  contentAnalysis: ContentAnalysis;
  grammarIssues: GrammarIssue[];
  seoSuggestions?: SeoSuggestion[];
  focusKeyword?: string;
  onAddIntro?: (text: string) => void;
  onAddConclusion?: (text: string) => void;
  onApplyGrammarFix?: (original: string, correction: string) => void;
  onApplyAllGrammarFixes?: () => void;
  onApplySeoFix?: (suggestion: SeoSuggestion) => void;
}

export function ContentImprovementCard({
  contentAnalysis,
  grammarIssues,
  seoSuggestions = [],
  focusKeyword,
  onAddIntro,
  onAddConclusion,
  onApplyGrammarFix,
  onApplyAllGrammarFixes,
  onApplySeoFix,
}: ContentImprovementCardProps) {
  const [expandedGrammar, setExpandedGrammar] = useState(false);
  const [expandedSeo, setExpandedSeo] = useState(false);
  const [dismissedIntro, setDismissedIntro] = useState(false);
  const [dismissedConclusion, setDismissedConclusion] = useState(false);
  const [appliedSeoFixes, setAppliedSeoFixes] = useState<string[]>([]);

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case 'formal':
        return 'رسمي';
      case 'professional':
        return 'احترافي';
      case 'casual':
        return 'غير رسمي';
      default:
        return tone;
    }
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'spelling':
        return 'إملائي';
      case 'grammar':
        return 'نحوي';
      case 'punctuation':
        return 'ترقيم';
      case 'style':
        return 'أسلوب';
      default:
        return type;
    }
  };

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'spelling':
        return 'bg-danger/20 text-danger';
      case 'grammar':
        return 'bg-warning/20 text-warning';
      case 'punctuation':
        return 'bg-info/20 text-info';
      case 'style':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeoTypeLabel = (type: string) => {
    switch (type) {
      case 'keyword-intro':
        return 'الكلمة المفتاحية في المقدمة';
      case 'keyword-heading':
        return 'الكلمة المفتاحية في العناوين';
      case 'internal-link':
        return 'روابط داخلية';
      case 'external-link':
        return 'روابط خارجية';
      case 'paragraph-length':
        return 'طول الفقرات';
      case 'image-alt':
        return 'النص البديل للصور';
      default:
        return type;
    }
  };

  const getSeoTypeIcon = (type: string) => {
    switch (type) {
      case 'keyword-intro':
      case 'keyword-heading':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      case 'internal-link':
      case 'external-link':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'paragraph-length':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        );
      case 'image-alt':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-danger/20 text-danger';
      case 'medium':
        return 'bg-warning/20 text-warning';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleApplySeoFix = (suggestion: SeoSuggestion) => {
    if (onApplySeoFix) {
      onApplySeoFix(suggestion);
      setAppliedSeoFixes(prev => [...prev, suggestion.type + suggestion.issue]);
    }
  };

  // Filter out applied SEO fixes
  const activeSeoSuggestions = seoSuggestions.filter(
    s => !appliedSeoFixes.includes(s.type + s.issue)
  );

  const showIntroSuggestion = !contentAnalysis.hasStrongIntro && contentAnalysis.suggestedIntro && !dismissedIntro;
  const showConclusionSuggestion = !contentAnalysis.hasConclusion && contentAnalysis.suggestedConclusion && !dismissedConclusion;
  const hasGrammarIssues = grammarIssues.length > 0;
  const hasSeoSuggestions = activeSeoSuggestions.length > 0;

  // Check if there's anything to show
  if (!showIntroSuggestion && !showConclusionSuggestion && !hasGrammarIssues && !hasSeoSuggestions) {
    return (
      <Card className="bg-success/5 border-success/20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">محتوى ممتاز!</h3>
              <p className="text-sm text-muted-foreground">
                المقال مكتوب بشكل جيد ولا يحتاج لتحسينات إضافية.
              </p>
            </div>
          </div>

          {/* Tone and Audience Info */}
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong>الأسلوب:</strong> {getToneLabel(contentAnalysis.tone)}
            </span>
            {contentAnalysis.targetAudience && (
              <span>
                <strong>الجمهور:</strong> {contentAnalysis.targetAudience}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            تحسينات المحتوى
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>الأسلوب: {getToneLabel(contentAnalysis.tone)}</span>
          </div>
        </div>

        {/* Introduction Suggestion */}
        {showIntroSuggestion && (
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">المقال يفتقر لمقدمة قوية</h4>
                <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-md mb-3">
                  {contentAnalysis.suggestedIntro}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAddIntro?.(contentAnalysis.suggestedIntro!)}
                  >
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    إضافة المقدمة
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissedIntro(true)}
                  >
                    تجاهل
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conclusion Suggestion */}
        {showConclusionSuggestion && (
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">المقال يفتقر لخاتمة</h4>
                <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-md mb-3">
                  {contentAnalysis.suggestedConclusion}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAddConclusion?.(contentAnalysis.suggestedConclusion!)}
                  >
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    إضافة الخاتمة
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissedConclusion(true)}
                  >
                    تجاهل
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grammar Issues */}
        {hasGrammarIssues && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                تم العثور على {grammarIssues.length} {grammarIssues.length === 1 ? 'خطأ' : 'أخطاء'}
              </h4>
              {grammarIssues.length > 3 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onApplyAllGrammarFixes}
                >
                  تصحيح الكل
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {grammarIssues
                .slice(0, expandedGrammar ? undefined : 3)
                .map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/30 rounded-lg flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getIssueTypeColor(issue.type)}`}>
                          {getIssueTypeLabel(issue.type)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="line-through text-danger/70">{issue.original}</span>
                        <svg className="inline-block w-4 h-4 mx-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-success font-medium">{issue.correction}</span>
                      </div>
                      {issue.explanation && (
                        <p className="text-xs text-muted-foreground mt-1">{issue.explanation}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onApplyGrammarFix?.(issue.original, issue.correction)}
                      className="shrink-0"
                    >
                      تصحيح
                    </Button>
                  </div>
                ))}

              {grammarIssues.length > 3 && (
                <button
                  onClick={() => setExpandedGrammar(!expandedGrammar)}
                  className="w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1"
                >
                  {expandedGrammar ? 'عرض أقل' : `عرض ${grammarIssues.length - 3} أخطاء أخرى`}
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedGrammar ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SEO Suggestions */}
        {hasSeoSuggestions && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                تحسينات SEO
                {focusKeyword && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {focusKeyword}
                  </span>
                )}
              </h4>
              <span className="text-xs text-muted-foreground">
                {activeSeoSuggestions.length} اقتراح
              </span>
            </div>

            <div className="space-y-2">
              {activeSeoSuggestions
                .slice(0, expandedSeo ? undefined : 3)
                .map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-success/5 border border-success/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-success">
                            {getSeoTypeIcon(suggestion.type)}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {getSeoTypeLabel(suggestion.type)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority === 'high' ? 'مهم' : suggestion.priority === 'medium' ? 'متوسط' : 'منخفض'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.issue}
                        </p>
                        <p className="text-sm text-foreground bg-success/10 p-2 rounded">
                          <strong>الاقتراح:</strong> {suggestion.suggestion}
                        </p>
                      </div>
                      {suggestion.autoFixable && onApplySeoFix && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApplySeoFix(suggestion)}
                          className="shrink-0"
                        >
                          تطبيق
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

              {activeSeoSuggestions.length > 3 && (
                <button
                  onClick={() => setExpandedSeo(!expandedSeo)}
                  className="w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1"
                >
                  {expandedSeo ? 'عرض أقل' : `عرض ${activeSeoSuggestions.length - 3} اقتراحات أخرى`}
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedSeo ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success state when all improvements are handled */}
        {!showIntroSuggestion && !showConclusionSuggestion && !hasGrammarIssues && !hasSeoSuggestions && (
          <div className="flex items-center gap-3 p-4 bg-success/5 rounded-lg">
            <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-foreground">تم تطبيق جميع التحسينات</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ContentImprovementCard;
