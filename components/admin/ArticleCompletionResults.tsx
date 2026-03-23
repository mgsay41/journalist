'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { SeoScoreCard } from './SeoScoreCard';
import { CategoryTagSelector } from './CategoryTagSelector';
import { MetaOptionsSelector } from './MetaOptionsSelector';
import { ContentImprovementCard } from './ContentImprovementCard';
import { AiImageGenerator, type GeneratedImageData } from './AiImageGenerator';

// Types matching the API response
interface SuggestedCategory {
  name: string;
  isExisting: boolean;
  confidence: number;
  reason?: string;
  id?: string;
}

interface SuggestedTag {
  name: string;
  isExisting: boolean;
  relevance: 'high' | 'medium' | 'low';
  id?: string;
}

interface MetaTitleOption {
  title: string;
  length: number;
  score: number;
  hasKeyword: boolean;
}

interface TitleSuggestion {
  title: string;
  improvements: string[];
  score: number;
  hasPowerWords: boolean;
  hasNumber: boolean;
  hasKeywordAtStart: boolean;
}

interface MetaDescriptionOption {
  description: string;
  length: number;
  score: number;
  hasKeyword: boolean;
  hasCTA: boolean;
}

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

interface SeoAnalysis {
  score: number;
  status: 'good' | 'needs-improvement' | 'poor';
  topIssues: string[];
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

export interface CompletionResults {
  focusKeyword: string;
  secondaryKeywords: string[];
  suggestedCategories: SuggestedCategory[];
  suggestedTags: SuggestedTag[];
  slug: string;
  titleSuggestions?: TitleSuggestion[];
  metaTitles: MetaTitleOption[];
  metaDescriptions: MetaDescriptionOption[];
  excerpt: string;
  contentAnalysis: ContentAnalysis;
  grammarIssues: GrammarIssue[];
  seoAnalysis: SeoAnalysis;
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
}

interface ArticleCompletionResultsProps {
  results: CompletionResults;
  onContentChange: (content: string) => void;
  currentContent: string;
  currentTitle: string;
  onTitleChange: (title: string) => void;
  onSave?: (data: {
    title: string;
    slug: string;
    focusKeyword: string;
    metaTitle: string;
    metaDescription: string;
    excerpt: string;
    categoryIds: string[];
    tagIds: string[];
    newTagNames: string[];
    newCategoryNames: string[];
  }) => void;
  onSaveDraft: (data: {
    title: string;
    slug: string;
    focusKeyword: string;
    metaTitle: string;
    metaDescription: string;
    excerpt: string;
    categoryIds: string[];
    tagIds: string[];
    newTagNames: string[];
    newCategoryNames: string[];
  }) => void;
  onRegenerate: () => void;
  isSaving?: boolean;
  error?: string | null;
  onClearError?: () => void;
  draftOnly?: boolean;
}

export function ArticleCompletionResults({
  results,
  onContentChange,
  currentContent,
  currentTitle,
  onTitleChange,
  onSave,
  onSaveDraft,
  onRegenerate,
  isSaving = false,
  error,
  onClearError,
  draftOnly = false,
}: ArticleCompletionResultsProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // State for user selections
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => {
    // Pre-select ALL existing categories suggested by AI (no limit)
    return results.suggestedCategories
      .filter(c => c.isExisting && c.id)
      .map(c => c.id!);
  });

  const [newCategoryNames, setNewCategoryNames] = useState<string[]>(() => {
    // Pre-select new categories suggested by AI
    return results.suggestedCategories
      .filter(c => !c.isExisting)
      .map(c => c.name);
  });

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    // Pre-select existing tags suggested by AI
    return results.suggestedTags
      .filter(t => t.isExisting && t.id)
      .map(t => t.id!)
      .slice(0, 10);
  });

  const [newTagNames, setNewTagNames] = useState<string[]>(() => {
    // Pre-select new tags suggested by AI (up to remaining space)
    const existingCount = results.suggestedTags.filter(t => t.isExisting && t.id).length;
    return results.suggestedTags
      .filter(t => !t.isExisting)
      .map(t => t.name)
      .slice(0, Math.max(0, 10 - existingCount));
  });

  // Track which grammar fixes have been applied
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);

  const [selectedTitleIndex, setSelectedTitleIndex] = useState(-1); // -1 means keep original
  const [selectedMetaTitleIndex, setSelectedMetaTitleIndex] = useState(0);
  const [selectedMetaDescriptionIndex, setSelectedMetaDescriptionIndex] = useState(0);
  const [customMetaTitle, setCustomMetaTitle] = useState('');
  const [customMetaDescription, setCustomMetaDescription] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [focusKeyword, setFocusKeyword] = useState(results.focusKeyword);

  // AI Image Generator state
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [generatedFeaturedImage, setGeneratedFeaturedImage] = useState<GeneratedImageData | null>(null);

  // AI SEO Fix state
  const [isAiFixing, setIsAiFixing] = useState(false);

  // Get current title
  const getCurrentTitle = useCallback(() => {
    if (selectedTitleIndex === -1) return currentTitle;
    return results.titleSuggestions?.[selectedTitleIndex]?.title || currentTitle;
  }, [selectedTitleIndex, currentTitle, results.titleSuggestions]);

  // Handle title selection
  const handleTitleSelect = useCallback((index: number) => {
    setSelectedTitleIndex(index);
    if (index >= 0 && results.titleSuggestions?.[index]) {
      onTitleChange(results.titleSuggestions[index].title);
    } else {
      // Keep original - don't change anything
    }
  }, [results.titleSuggestions, onTitleChange]);

  // Get current values
  const getCurrentMetaTitle = useCallback(() => {
    if (selectedMetaTitleIndex === -1) return customMetaTitle;
    return results.metaTitles[selectedMetaTitleIndex]?.title || '';
  }, [selectedMetaTitleIndex, customMetaTitle, results.metaTitles]);

  const getCurrentMetaDescription = useCallback(() => {
    if (selectedMetaDescriptionIndex === -1) return customMetaDescription;
    return results.metaDescriptions[selectedMetaDescriptionIndex]?.description || '';
  }, [selectedMetaDescriptionIndex, customMetaDescription, results.metaDescriptions]);

  const getCurrentSlug = useCallback(() => {
    return customSlug || results.slug;
  }, [customSlug, results.slug]);

  // Handle content improvements
  const handleAddIntro = useCallback((intro: string) => {
    // Add introduction to the beginning of content
    const newContent = `<p>${intro}</p>\n\n${currentContent}`;
    onContentChange(newContent);
  }, [currentContent, onContentChange]);

  const handleAddConclusion = useCallback((conclusion: string) => {
    // Add conclusion to the end of content
    const newContent = `${currentContent}\n\n<p>${conclusion}</p>`;
    onContentChange(newContent);
  }, [currentContent, onContentChange]);

  const handleApplyGrammarFix = useCallback((original: string, correction: string) => {
    // Try multiple replacement strategies
    let newContent = currentContent;
    let replaced = false;

    // Strategy 1: Direct replace
    if (newContent.includes(original)) {
      newContent = newContent.replace(original, correction);
      replaced = true;
    }

    // Strategy 2: Try with HTML entities decoded
    if (!replaced) {
      const decodedOriginal = original.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
      if (newContent.includes(decodedOriginal)) {
        newContent = newContent.replace(decodedOriginal, correction);
        replaced = true;
      }
    }

    // Strategy 3: Try regex with flexible whitespace
    if (!replaced) {
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleRegex = new RegExp(escapedOriginal.replace(/\s+/g, '\\s+'), 'g');
      if (flexibleRegex.test(newContent)) {
        newContent = newContent.replace(flexibleRegex, correction);
        replaced = true;
      }
    }

    if (replaced) {
      onContentChange(newContent);
      // Remove the fixed issue from display by updating local state
      setAppliedFixes(prev => [...prev, original]);
    } else {
      console.log('Could not find text to replace:', original);
      // Still mark as applied to hide it (AI might have detected something no longer there)
      setAppliedFixes(prev => [...prev, original]);
    }
  }, [currentContent, onContentChange]);

  const handleApplyAllGrammarFixes = useCallback(() => {
    let newContent = currentContent;
    const newAppliedFixes: string[] = [];

    for (const issue of results.grammarIssues) {
      // Try direct replace
      if (newContent.includes(issue.original)) {
        newContent = newContent.replace(issue.original, issue.correction);
        newAppliedFixes.push(issue.original);
      } else {
        // Try with flexible whitespace
        const escapedOriginal = issue.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flexibleRegex = new RegExp(escapedOriginal.replace(/\s+/g, '\\s+'), 'g');
        if (flexibleRegex.test(newContent)) {
          newContent = newContent.replace(flexibleRegex, issue.correction);
        }
        newAppliedFixes.push(issue.original);
      }
    }

    onContentChange(newContent);
    setAppliedFixes(prev => [...prev, ...newAppliedFixes]);
  }, [currentContent, results.grammarIssues, onContentChange]);

  // Generate SEO suggestions based on content analysis
  const generateSeoSuggestions = useCallback((): SeoSuggestion[] => {
    const suggestions: SeoSuggestion[] = [];
    const plainContent = currentContent.replace(/<[^>]*>/g, '');
    const keyword = focusKeyword.toLowerCase();

    // Check if keyword is in first paragraph
    const firstParagraphMatch = currentContent.match(/<p[^>]*>(.*?)<\/p>/i);
    const firstParagraph = firstParagraphMatch ? firstParagraphMatch[1].replace(/<[^>]*>/g, '') : plainContent.substring(0, 300);

    if (keyword && !firstParagraph.toLowerCase().includes(keyword)) {
      suggestions.push({
        type: 'keyword-intro',
        issue: `الكلمة المفتاحية "${focusKeyword}" غير موجودة في المقدمة`,
        suggestion: `أضف الكلمة المفتاحية "${focusKeyword}" في الفقرة الأولى لتحسين SEO`,
        priority: 'high',
        autoFixable: true,
        fixData: {
          action: 'add-keyword-intro',
          value: focusKeyword,
        },
      });
    }

    // Check if keyword is in any H2/H3
    const headings = currentContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || [];
    const headingsText = headings.map(h => h.replace(/<[^>]*>/g, '').toLowerCase());
    if (keyword && headingsText.length > 0 && !headingsText.some(h => h.includes(keyword))) {
      suggestions.push({
        type: 'keyword-heading',
        issue: `الكلمة المفتاحية "${focusKeyword}" غير موجودة في أي عنوان فرعي`,
        suggestion: `أضف الكلمة المفتاحية في أحد عناوين H2 أو H3 لتحسين ترتيب الصفحة`,
        priority: 'medium',
        autoFixable: false,
      });
    }

    // Check for internal links
    const internalLinks = currentContent.match(/<a[^>]+href=["'][^"']*(?:\/|localhost)[^"']*["'][^>]*>/gi) || [];
    if (internalLinks.length === 0) {
      suggestions.push({
        type: 'internal-link',
        issue: 'لا توجد روابط داخلية في المقال',
        suggestion: 'أضف رابطًا أو أكثر لمقالات أخرى في موقعك لتحسين الترابط الداخلي',
        priority: 'medium',
        autoFixable: false,
      });
    }

    // Check for external links
    const allLinks = currentContent.match(/<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi) || [];
    const externalLinks = allLinks.filter(link => !link.includes('localhost') && !link.includes(window.location.hostname));
    if (externalLinks.length === 0) {
      suggestions.push({
        type: 'external-link',
        issue: 'لا توجد روابط خارجية في المقال',
        suggestion: 'أضف رابطًا أو أكثر لمصادر موثوقة لتحسين مصداقية المقال',
        priority: 'low',
        autoFixable: false,
      });
    }

    // Check for long paragraphs (>120 words)
    const paragraphs = currentContent.match(/<p[^>]*>(.*?)<\/p>/gi) || [];
    const longParagraphs = paragraphs.filter(p => {
      const text = p.replace(/<[^>]*>/g, '');
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      return wordCount > 120;
    });
    if (longParagraphs.length > 0) {
      suggestions.push({
        type: 'paragraph-length',
        issue: `يوجد ${longParagraphs.length} فقرات طويلة جدًا (أكثر من 120 كلمة)`,
        suggestion: 'قسّم الفقرات الطويلة إلى فقرات أصغر لتحسين قابلية القراءة',
        priority: 'low',
        autoFixable: false,
      });
    }

    // Check for images without alt text
    const images = currentContent.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = images.filter(img => !img.includes('alt=') || img.includes('alt=""') || img.includes("alt=''"));
    if (imagesWithoutAlt.length > 0) {
      suggestions.push({
        type: 'image-alt',
        issue: `يوجد ${imagesWithoutAlt.length} صور بدون نص بديل`,
        suggestion: 'أضف نصًا بديلاً وصفيًا لجميع الصور لتحسين SEO والوصولية',
        priority: 'medium',
        autoFixable: false,
      });
    }

    return suggestions;
  }, [currentContent, focusKeyword]);

  // Handle SEO fix application
  const handleApplySeoFix = useCallback((suggestion: SeoSuggestion) => {
    if (!suggestion.autoFixable || !suggestion.fixData) return;

    if (suggestion.fixData.action === 'add-keyword-intro' && suggestion.fixData.value) {
      // Add keyword to the first paragraph
      const firstParagraphMatch = currentContent.match(/(<p[^>]*>)(.*?)(<\/p>)/i);
      if (firstParagraphMatch) {
        const [fullMatch, openTag, content, closeTag] = firstParagraphMatch;
        // Add the keyword naturally at the start
        const newContent = currentContent.replace(
          fullMatch,
          `${openTag}${suggestion.fixData.value} - ${content}${closeTag}`
        );
        onContentChange(newContent);
      }
    }
  }, [currentContent, onContentChange]);

  // Get SEO suggestions
  const seoSuggestions = generateSeoSuggestions();

  // Handle categories and tags change
  const handleCategoriesChange = useCallback((ids: string[], newNames: string[]) => {
    setSelectedCategoryIds(ids);
    setNewCategoryNames(newNames);
  }, []);

  const handleTagsChange = useCallback((ids: string[], newNames: string[]) => {
    setSelectedTagIds(ids);
    setNewTagNames(newNames);
  }, []);

  // AI Image Generator handlers
  const handleImageGenerated = useCallback((image: GeneratedImageData) => {
    setGeneratedFeaturedImage(image);
  }, []);

  const handleSetAsFeatured = useCallback((imageUrl: string, publicId?: string) => {
    // Store the featured image info to be saved with the article
    // This will be sent to the parent component or stored for later use
    setGeneratedFeaturedImage({
      imageUrl,
      width: 0,
      height: 0,
      seed: '',
      model: 'flux',
      prompt: '',
      cloudinaryPublicId: publicId,
    });
    setShowImageGenerator(false);
  }, []);

  // AI SEO Fix handler
  const handleAiFixSeoIssue = useCallback(async (type: 'internal-links' | 'external-links' | 'long-paragraphs') => {
    setIsAiFixing(true);
    try {
      const response = await fetch('/api/admin/ai/auto-fix-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type,
          title: currentTitle,
          content: currentContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل في الإصلاح التلقائي');
      }

      const result = await response.json();

      // Update content with the fixed version
      if (result.modifiedContent) {
        onContentChange(result.modifiedContent);
      }
    } catch (error) {
      console.error('AI fix error:', error);
      throw error;
    } finally {
      setIsAiFixing(false);
    }
  }, [currentTitle, currentContent, onContentChange]);

  // Prepare save data
  const getSaveData = useCallback(() => {
    return {
      title: getCurrentTitle(),
      slug: getCurrentSlug(),
      focusKeyword,
      metaTitle: getCurrentMetaTitle(),
      metaDescription: getCurrentMetaDescription(),
      excerpt: results.excerpt,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
      newTagNames,
      newCategoryNames,
    };
  }, [
    getCurrentTitle,
    getCurrentSlug,
    focusKeyword,
    getCurrentMetaTitle,
    getCurrentMetaDescription,
    results.excerpt,
    selectedCategoryIds,
    selectedTagIds,
    newTagNames,
    newCategoryNames,
  ]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(getSaveData());
    }
  }, [onSave, getSaveData]);

  const handleSaveDraft = useCallback(() => {
    onSaveDraft(getSaveData());
  }, [onSaveDraft, getSaveData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">نتائج الذكاء الاصطناعي</h2>
            <p className="text-sm text-muted-foreground">راجع وعدّل البيانات المقترحة قبل الحفظ</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onRegenerate}
          disabled={isSaving}
          className="gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          إعادة التحليل
        </Button>
      </div>

      {/* SEO Score Card */}
      <SeoScoreCard
        score={results.seoAnalysis.score}
        status={results.seoAnalysis.status}
        topIssues={results.seoAnalysis.topIssues}
      />

      {/* Title Suggestions */}
      {results.titleSuggestions && results.titleSuggestions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <h3 className="font-semibold text-foreground">تحسين العنوان</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">اختر عنواناً محسّناً لتحسين SEO وجذب القراء</p>
          </div>

          <div className="p-4 space-y-3">
            {/* Keep Original Option */}
            <button
              onClick={() => handleTitleSelect(-1)}
              className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                selectedTitleIndex === -1
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                      العنوان الحالي
                    </span>
                    {selectedTitleIndex === -1 && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-foreground font-medium">{currentTitle}</p>
                </div>
              </div>
            </button>

            {/* AI Suggested Titles */}
            {results.titleSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleTitleSelect(index)}
                className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                  selectedTitleIndex === index
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        اقتراح {index + 1}
                      </span>
                      {suggestion.score >= 80 && (
                        <span className="text-xs font-medium px-2 py-0.5 bg-success/10 text-success rounded-full">
                          موصى به
                        </span>
                      )}
                      {suggestion.hasPowerWords && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          كلمات قوية
                        </span>
                      )}
                      {suggestion.hasNumber && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          يحتوي رقم
                        </span>
                      )}
                      {suggestion.hasKeywordAtStart && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          كلمة مفتاحية في البداية
                        </span>
                      )}
                      {selectedTitleIndex === index && (
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-foreground font-medium">{suggestion.title}</p>
                    {suggestion.improvements && suggestion.improvements.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {suggestion.improvements.map((improvement, i) => (
                          <span key={i} className="text-xs text-muted-foreground">
                            • {improvement}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className={`text-sm font-bold ${
                      suggestion.score >= 80 ? 'text-success' :
                      suggestion.score >= 60 ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {suggestion.score}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category and Tag Selector */}
      <CategoryTagSelector
        suggestedCategories={results.suggestedCategories}
        suggestedTags={results.suggestedTags}
        availableCategories={results.availableCategories}
        availableTags={results.availableTags}
        selectedCategoryIds={selectedCategoryIds}
        selectedTagIds={selectedTagIds}
        newTagNames={newTagNames}
        newCategoryNames={newCategoryNames}
        onCategoriesChange={handleCategoriesChange}
        onTagsChange={handleTagsChange}
        maxTags={10}
      />

      {/* Meta Options Selector */}
      <MetaOptionsSelector
        slug={results.slug}
        focusKeyword={focusKeyword}
        secondaryKeywords={results.secondaryKeywords}
        metaTitles={results.metaTitles}
        metaDescriptions={results.metaDescriptions}
        excerpt={results.excerpt}
        selectedMetaTitleIndex={selectedMetaTitleIndex}
        selectedMetaDescriptionIndex={selectedMetaDescriptionIndex}
        customMetaTitle={customMetaTitle}
        customMetaDescription={customMetaDescription}
        customSlug={customSlug}
        onMetaTitleSelect={setSelectedMetaTitleIndex}
        onMetaDescriptionSelect={setSelectedMetaDescriptionIndex}
        onCustomMetaTitleChange={setCustomMetaTitle}
        onCustomMetaDescriptionChange={setCustomMetaDescription}
        onSlugChange={setCustomSlug}
        onFocusKeywordChange={setFocusKeyword}
      />

      {/* AI Featured Image Generator */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="font-semibold text-foreground">صورة الغلف بالذكاء الاصطناعي</h3>
            </div>
            {!showImageGenerator && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImageGenerator(true)}
                className="gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                توليد صورة
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            قم بتوليد صورة غلاف احترافية باستخدام الذكاء الاصطناعي بناءً على محتوى المقال
          </p>
        </div>

        <div className="p-4">
          {showImageGenerator ? (
            <AiImageGenerator
              articleTitle={getCurrentTitle()}
              articleContent={currentContent}
              articleCategory={results.suggestedCategories[0]?.name}
              onImageGenerated={handleImageGenerated}
              onSetAsFeatured={handleSetAsFeatured}
              onClose={() => setShowImageGenerator(false)}
            />
          ) : generatedFeaturedImage ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-video max-w-md mx-auto">
                <img
                  src={generatedFeaturedImage.imageUrl}
                  alt="Generated featured image"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImageGenerator(true)}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  إعادة التوليد
                </Button>
                <div className="text-sm text-success flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  تم توليد الصورة بنجاح
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                اضغط على &quot;توليد صورة&quot; لإنشاء صورة غلاف احترافية باستخدام الذكاء الاصطناعي
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded-full">✓ مجاني تماماً</span>
                <span className="px-2 py-1 bg-muted rounded-full">✓ جودة عالية</span>
                <span className="px-2 py-1 bg-muted rounded-full">✓ خيارات متعددة</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Improvement Card */}
      <ContentImprovementCard
        contentAnalysis={results.contentAnalysis}
        grammarIssues={results.grammarIssues.filter(issue => !appliedFixes.includes(issue.original))}
        seoSuggestions={seoSuggestions}
        focusKeyword={focusKeyword}
        onAddIntro={handleAddIntro}
        onAddConclusion={handleAddConclusion}
        onApplyGrammarFix={handleApplyGrammarFix}
        onApplyAllGrammarFixes={handleApplyAllGrammarFixes}
        onApplySeoFix={handleApplySeoFix}
        onAiFixSeoIssue={handleAiFixSeoIssue}
        articleTitle={currentTitle}
        isAiFixing={isAiFixing}
      />

      {/* Action Buttons */}
      <div className="pt-4 border-t border-border space-y-3">
        {/* Error Message */}
        {error && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Draft Only Mode - Only save draft button */}
        {draftOnly ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              سيتم حفظ المقال كمسودة للمراجعة النهائية قبل النشر
            </p>
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="min-w-[180px]"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  حفظ ومتابعة التحرير
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </Button>
            {onSave && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-[140px]"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري النشر...
                  </>
                ) : (
                  'نشر المقال'
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ArticleCompletionResults;
