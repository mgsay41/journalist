'use client';

import { useState, useCallback, useEffect } from 'react';
import { analyzeArticle, ArticleContent, SeoAnalysisResult, SeoCriterion, SeoCategory } from '@/lib/seo';
import { Card } from '@/components/ui/Card';

interface SeoScorePanelProps {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  slug?: string;
  hasFeaturedImage: boolean;
  imageCount?: number;
  imagesWithAlt?: number;
  onFocusKeywordChange?: (keyword: string) => void;
  onMetaTitleChange?: (title: string) => void;
  onMetaDescriptionChange?: (description: string) => void;
}

export function SeoScorePanel({
  title,
  content,
  excerpt,
  metaTitle,
  metaDescription,
  focusKeyword,
  slug,
  hasFeaturedImage,
  imageCount = 0,
  imagesWithAlt = 0,
  onFocusKeywordChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: SeoScorePanelProps) {
  const [analysis, setAnalysis] = useState<SeoAnalysisResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['content', 'keyword']));
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Debounced analysis
  useEffect(() => {
    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      const articleContent: ArticleContent = {
        title,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        focusKeyword,
        slug,
        hasFeaturedImage,
        imageCount,
        imagesWithAlt,
      };
      const result = analyzeArticle(articleContent);
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [title, content, excerpt, metaTitle, metaDescription, focusKeyword, slug, hasFeaturedImage, imageCount, imagesWithAlt]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 70) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getStatusIcon = (status: 'passed' | 'warning' | 'failed') => {
    switch (status) {
      case 'passed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good':
        return 'جيد';
      case 'needs-improvement':
        return 'يحتاج تحسين';
      case 'poor':
        return 'ضعيف';
    }
  };

  if (!analysis) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            <span className="mr-3 text-muted-foreground">جاري التحليل...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Score Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">تحليل SEO</h3>
          {isAnalyzing && (
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-muted-foreground ml-2"></div>
              جاري التحديث
            </div>
          )}
        </div>

        {/* Score Circle */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={analysis.percentage >= 70 ? 'var(--success)' : analysis.percentage >= 50 ? 'var(--warning)' : 'var(--danger)'}
                strokeWidth="3"
                strokeDasharray={`${analysis.percentage}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(analysis.percentage)}`}>
                {analysis.percentage}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className={`text-lg font-semibold ${getScoreColor(analysis.percentage)}`}>
              {getStatusLabel(analysis.status)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {analysis.score} / {analysis.maxScore} نقطة
            </div>
          </div>
        </div>
      </div>

      {/* Focus Keyword Input */}
      <div className="p-4 border-b border-border bg-muted/50">
        <label className="block text-sm font-medium text-foreground mb-2">
          الكلمة المفتاحية الرئيسية
        </label>
        <input
          type="text"
          value={focusKeyword || ''}
          onChange={(e) => onFocusKeywordChange?.(e.target.value)}
          placeholder="أدخل الكلمة المفتاحية..."
          className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
          dir="rtl"
        />
        {!focusKeyword && (
          <p className="mt-2 text-xs text-muted-foreground">
            أضف كلمة مفتاحية لتحليل استخدامها في المحتوى
          </p>
        )}
      </div>

      {/* Top Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">أهم التحسينات</h4>
          <ul className="space-y-2">
            {analysis.suggestions.slice(0, 3).map((suggestion) => (
              <li key={suggestion.id} className="flex items-start gap-2">
                <span className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                  suggestion.priority === 'high' ? 'bg-danger' :
                  suggestion.priority === 'medium' ? 'bg-warning' : 'bg-muted-foreground'
                }`} />
                <span className="text-sm text-foreground/80">{suggestion.messageAr}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories */}
      <div className="divide-y divide-border">
        {analysis.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            getStatusIcon={getStatusIcon}
          />
        ))}
      </div>

      {/* Meta Fields */}
      <div className="p-4 border-t border-border bg-muted/50">
        <h4 className="text-sm font-medium text-foreground mb-4">بيانات الميتا</h4>

        {/* Meta Title */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">عنوان الميتا</label>
            <span className={`text-xs font-medium ${
              (metaTitle?.length || title.length) >= 40 && (metaTitle?.length || title.length) <= 60
                ? 'text-success'
                : (metaTitle?.length || title.length) > 0
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }`}>
              {metaTitle?.length || title.length} / 60
            </span>
          </div>
          <input
            type="text"
            value={metaTitle || ''}
            onChange={(e) => onMetaTitleChange?.(e.target.value)}
            placeholder={title || 'أدخل عنوان الميتا...'}
            className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
            dir="rtl"
          />
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">الوصف الموجز</label>
            <span className={`text-xs font-medium ${
              (metaDescription?.length || 0) >= 120 && (metaDescription?.length || 0) <= 160
                ? 'text-success'
                : (metaDescription?.length || 0) > 0
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }`}>
              {metaDescription?.length || 0} / 160
            </span>
          </div>
          <textarea
            value={metaDescription || ''}
            onChange={(e) => onMetaDescriptionChange?.(e.target.value)}
            placeholder={excerpt || 'أدخل وصفاً موجزاً للمقال...'}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground resize-none transition-all"
            dir="rtl"
          />
        </div>
      </div>
    </Card>
  );
}

// Category Section Component
interface CategorySectionProps {
  category: SeoCategory;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusIcon: (status: 'passed' | 'warning' | 'failed') => React.ReactNode;
}

function CategorySection({ category, isExpanded, onToggle, getStatusIcon }: CategorySectionProps) {
  const passedCount = category.criteria.filter(c => c.status === 'passed').length;
  const totalCount = category.criteria.length;
  const percentage = totalCount > 0 ? Math.round((category.score / category.maxScore) * 100) : 0;

  return (
    <div>
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-foreground">{category.nameAr}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${
            percentage >= 70 ? 'text-success' :
            percentage >= 50 ? 'text-warning' : 'text-danger'
          }`}>
            {passedCount}/{totalCount}
          </span>
          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 70 ? 'bg-success' :
                percentage >= 50 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </button>

      {/* Criteria List */}
      {isExpanded && (
        <div className="px-4 pb-3">
          <ul className="space-y-2">
            {category.criteria.map((criterion) => (
              <CriterionItem
                key={criterion.id}
                criterion={criterion}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Criterion Item Component
interface CriterionItemProps {
  criterion: SeoCriterion;
  getStatusIcon: (status: 'passed' | 'warning' | 'failed') => React.ReactNode;
}

function CriterionItem({ criterion, getStatusIcon }: CriterionItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <li
      className="flex items-start gap-2 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="shrink-0 mt-0.5">
        {getStatusIcon(criterion.status)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${
            criterion.status === 'passed' ? 'text-foreground/80' :
            criterion.status === 'warning' ? 'text-warning' : 'text-danger'
          }`}>
            {criterion.nameAr}
          </span>
          {criterion.value !== undefined && (
            <span className="text-xs text-muted-foreground mr-2">
              {criterion.value}
            </span>
          )}
        </div>
        {criterion.status !== 'passed' && criterion.recommendationAr && (
          <p className="text-xs text-muted-foreground mt-1">
            {criterion.recommendationAr}
          </p>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-1 z-10 w-56 p-3 bg-foreground text-background text-xs rounded-md shadow-lg">
          <p>{criterion.descriptionAr}</p>
          <div className="mt-2 text-background/70">
            النقاط: {criterion.score}/{criterion.maxScore}
          </div>
        </div>
      )}
    </li>
  );
}

export default SeoScorePanel;
