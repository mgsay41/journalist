'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface MetaTitleOption {
  title: string;
  length: number;
  score: number;
  hasKeyword: boolean;
}

interface MetaDescriptionOption {
  description: string;
  length: number;
  score: number;
  hasKeyword: boolean;
  hasCTA: boolean;
}

interface MetaOptionsSelectorProps {
  slug: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  metaTitles: MetaTitleOption[];
  metaDescriptions: MetaDescriptionOption[];
  excerpt: string;
  selectedMetaTitleIndex: number;
  selectedMetaDescriptionIndex: number;
  customMetaTitle: string;
  customMetaDescription: string;
  customSlug: string;
  onMetaTitleSelect: (index: number) => void;
  onMetaDescriptionSelect: (index: number) => void;
  onCustomMetaTitleChange: (value: string) => void;
  onCustomMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onFocusKeywordChange: (value: string) => void;
}

export function MetaOptionsSelector({
  slug,
  focusKeyword,
  secondaryKeywords,
  metaTitles,
  metaDescriptions,
  excerpt,
  selectedMetaTitleIndex,
  selectedMetaDescriptionIndex,
  customMetaTitle,
  customMetaDescription,
  customSlug,
  onMetaTitleSelect,
  onMetaDescriptionSelect,
  onCustomMetaTitleChange,
  onCustomMetaDescriptionChange,
  onSlugChange,
  onFocusKeywordChange,
}: MetaOptionsSelectorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);

  const getLengthColor = (length: number, min: number, max: number) => {
    if (length >= min && length <= max) return 'text-success';
    if (length > max * 0.9 || length < min * 1.1) return 'text-warning';
    return 'text-danger';
  };

  const currentMetaTitle = selectedMetaTitleIndex === -1
    ? customMetaTitle
    : metaTitles[selectedMetaTitleIndex]?.title || '';

  const currentMetaDescription = selectedMetaDescriptionIndex === -1
    ? customMetaDescription
    : metaDescriptions[selectedMetaDescriptionIndex]?.description || '';

  const currentSlug = customSlug || slug;

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Keywords Section */}
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            الكلمات المفتاحية
          </h3>

          <div className="space-y-3">
            {/* Focus Keyword */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                الكلمة المفتاحية الرئيسية
              </label>
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => onFocusKeywordChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="أدخل الكلمة المفتاحية الرئيسية..."
              />
            </div>

            {/* Secondary Keywords */}
            {secondaryKeywords.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  كلمات مفتاحية ثانوية
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {secondaryKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-0.5 bg-muted text-xs rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slug Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              رابط المقال (Slug)
            </h3>
            <button
              onClick={() => setEditingSlug(!editingSlug)}
              className="text-xs text-primary hover:underline"
            >
              {editingSlug ? 'حفظ' : 'تعديل'}
            </button>
          </div>

          {editingSlug ? (
            <input
              type="text"
              value={currentSlug}
              onChange={(e) => onSlugChange(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all ltr"
              dir="ltr"
              placeholder="article-slug"
            />
          ) : (
            <div className="px-3 py-2 bg-muted/50 rounded-md font-mono text-sm ltr" dir="ltr">
              /{currentSlug}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            رابط باللغة الإنجليزية مُحسّن لمحركات البحث
          </p>
        </div>

        {/* Meta Title Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              عنوان الميتا
            </h3>
            <span className={`text-xs ${getLengthColor(currentMetaTitle.length, 40, 60)}`}>
              {currentMetaTitle.length} / 60 حرف
            </span>
          </div>

          <div className="space-y-2">
            {metaTitles.map((option, index) => (
              <label
                key={index}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedMetaTitleIndex === index
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-muted-foreground/30'
                  }
                `}
              >
                <input
                  type="radio"
                  name="metaTitle"
                  checked={selectedMetaTitleIndex === index}
                  onChange={() => onMetaTitleSelect(index)}
                  className="mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{option.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className={getLengthColor(option.length, 40, 60)}>
                      {option.length} حرف
                    </span>
                    {option.hasKeyword && (
                      <span className="text-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        يحتوي الكلمة المفتاحية
                      </span>
                    )}
                    {index === 0 && (
                      <span className="text-primary font-medium">موصى به</span>
                    )}
                  </div>
                </div>
              </label>
            ))}

            {/* Custom option */}
            <label
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${selectedMetaTitleIndex === -1
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-muted-foreground/30'
                }
              `}
            >
              <input
                type="radio"
                name="metaTitle"
                checked={selectedMetaTitleIndex === -1}
                onChange={() => onMetaTitleSelect(-1)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">كتابة عنوان مخصص</p>
                {selectedMetaTitleIndex === -1 && (
                  <input
                    type="text"
                    value={customMetaTitle}
                    onChange={(e) => onCustomMetaTitleChange(e.target.value)}
                    placeholder="أدخل عنوان الميتا المخصص..."
                    className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Meta Description Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              وصف الميتا
            </h3>
            <span className={`text-xs ${getLengthColor(currentMetaDescription.length, 120, 160)}`}>
              {currentMetaDescription.length} / 160 حرف
            </span>
          </div>

          <div className="space-y-2">
            {metaDescriptions.map((option, index) => (
              <label
                key={index}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedMetaDescriptionIndex === index
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-muted-foreground/30'
                  }
                `}
              >
                <input
                  type="radio"
                  name="metaDescription"
                  checked={selectedMetaDescriptionIndex === index}
                  onChange={() => onMetaDescriptionSelect(index)}
                  className="mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{option.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className={getLengthColor(option.length, 120, 160)}>
                      {option.length} حرف
                    </span>
                    {option.hasKeyword && (
                      <span className="text-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        كلمة مفتاحية
                      </span>
                    )}
                    {option.hasCTA && (
                      <span className="text-info flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        دعوة للعمل
                      </span>
                    )}
                    {index === 0 && (
                      <span className="text-primary font-medium">موصى به</span>
                    )}
                  </div>
                </div>
              </label>
            ))}

            {/* Custom option */}
            <label
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${selectedMetaDescriptionIndex === -1
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-muted-foreground/30'
                }
              `}
            >
              <input
                type="radio"
                name="metaDescription"
                checked={selectedMetaDescriptionIndex === -1}
                onChange={() => onMetaDescriptionSelect(-1)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">كتابة وصف مخصص</p>
                {selectedMetaDescriptionIndex === -1 && (
                  <textarea
                    value={customMetaDescription}
                    onChange={(e) => onCustomMetaDescriptionChange(e.target.value)}
                    placeholder="أدخل وصف الميتا المخصص..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-input-border rounded-md bg-input-bg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all"
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Excerpt Preview */}
        {excerpt && (
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              مقتطف المقال
            </h3>
            <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-md">
              {excerpt}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {excerpt.length} حرف - سيظهر في قوائم المقالات
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default MetaOptionsSelector;
