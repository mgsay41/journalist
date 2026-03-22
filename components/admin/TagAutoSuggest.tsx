'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

interface Tag {
  id: string;
  name: string;
  slug: string;
  articleCount?: number;
}

interface AiSuggestedTag {
  name: string;
  confidence: number;
  relevance: 'high' | 'medium' | 'low';
  reason: string;
  id?: string;
  isNew?: boolean;
}

interface AiTagsResponse {
  selectedTags: AiSuggestedTag[];
  primaryTag?: {
    name: string;
    reason: string;
  };
}

interface TagAutoSuggestProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagsData: Tag[];
  onTagsDataChange: (tags: Tag[]) => void;
  maxTags?: number;
  placeholder?: string;
  // AI suggestions props
  articleTitle?: string;
  articleContent?: string;
  enableAiSuggestions?: boolean;
}

const MAX_TAGS_DEFAULT = 10;
const DEBOUNCE_DELAY = 300;

export function TagAutoSuggest({
  selectedTags,
  onTagsChange,
  tagsData,
  onTagsDataChange,
  maxTags = MAX_TAGS_DEFAULT,
  placeholder = 'ابحث عن وسم أو أنشئ وسم جديد...',
  articleTitle = '',
  articleContent = '',
  enableAiSuggestions = true,
}: TagAutoSuggestProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestedTag[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if max tags reached
  const isMaxReached = selectedTags.length >= maxTags;

  // Check if AI can be used
  const canUseAi = enableAiSuggestions && articleTitle && articleContent;

  // Search for tags
  const searchTags = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const excludeIds = selectedTags.join(',');
      const url = `/api/admin/tags/search?q=${encodeURIComponent(searchQuery)}&exclude=${excludeIds}&limit=8`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('فشل البحث');
      }

      const data = await response.json();
      setSuggestions(data.tags || []);
      setCanCreate(data.canCreate || false);
    } catch (err) {
      setError('حدث خطأ أثناء البحث');
      setSuggestions([]);
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, [selectedTags]);

  // Fetch AI tag suggestions
  const fetchAiSuggestions = useCallback(async () => {
    if (!canUseAi || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setShowAiSuggestions(true);

    try {
      const response = await fetch('/api/admin/ai/auto-tags', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          maxTags: maxTags - selectedTags.length,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل في الحصول على اقتراحات الذكاء الاصطناعي');
      }

      const data = await response.json();
      if (data.success && data.tags) {
        setAiSuggestions(data.tags.selectedTags || []);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الاقتراحات');
    } finally {
      setAiLoading(false);
    }
  }, [canUseAi, articleTitle, articleContent, maxTags, selectedTags.length, aiLoading]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        searchTags(query);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen, searchTags]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select a tag
  const selectTag = useCallback((tag: Tag) => {
    if (isMaxReached) return;

    if (!selectedTags.includes(tag.id)) {
      onTagsChange([...selectedTags, tag.id]);

      // Add to tagsData if not already there
      if (!tagsData.find(t => t.id === tag.id)) {
        onTagsDataChange([...tagsData, tag]);
      }
    }

    setQuery('');
    setIsOpen(false);
  }, [selectedTags, onTagsChange, tagsData, onTagsDataChange, isMaxReached]);

  // Select AI suggested tag
  const selectAiTag = useCallback(async (aiTag: AiSuggestedTag) => {
    if (isMaxReached) return;

    // If tag already exists in our data, just select it
    const existingTag = tagsData.find(t => t.name === aiTag.name);
    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        onTagsChange([...selectedTags, existingTag.id]);
      }
    } else if (aiTag.id) {
      // Tag was returned with an ID (existing in database)
      onTagsChange([...selectedTags, aiTag.id]);
      onTagsDataChange([...tagsData, {
        id: aiTag.id,
        name: aiTag.name,
        slug: aiTag.name.toLowerCase().replace(/\s+/g, '-'),
        articleCount: 0,
      }]);
    } else {
      // New tag - create it
      setCreatingTag(true);
      try {
        const response = await fetch('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: aiTag.name }),
        });

        const data = await response.json();
        if (response.ok) {
          onTagsChange([...selectedTags, data.id]);
          onTagsDataChange([...tagsData, {
            id: data.id,
            name: data.name,
            slug: data.slug,
            articleCount: 0,
          }]);
        }
      } catch (err) {
        setError('فشل في إنشاء الوسم');
      } finally {
        setCreatingTag(false);
      }
    }

    // Remove from AI suggestions after selection
    setAiSuggestions(prev => prev.filter(t => t.name !== aiTag.name));
  }, [isMaxReached, selectedTags, tagsData, onTagsChange, onTagsDataChange]);

  // Select all AI suggestions
  const selectAllAiTags = useCallback(async () => {
    for (const tag of aiSuggestions) {
      await selectAiTag(tag);
    }
  }, [aiSuggestions, selectAiTag]);

  // Remove a tag
  const removeTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  }, [selectedTags, onTagsChange]);

  // Create a new tag
  const createTag = useCallback(async (tagName: string) => {
    if (!tagName.trim() || isMaxReached) return;

    setCreatingTag(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء الوسم');
      }

      // Add the new tag to selection and data
      const newTag: Tag = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        articleCount: 0,
      };

      onTagsChange([...selectedTags, newTag.id]);
      onTagsDataChange([...tagsData, newTag]);
      setQuery('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setCreatingTag(false);
    }
  }, [selectedTags, onTagsChange, tagsData, onTagsDataChange, isMaxReached]);

  // Handle input focus
  const handleFocus = () => {
    if (!isMaxReached) {
      setIsOpen(true);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && canCreate && query.trim()) {
      e.preventDefault();
      createTag(query);
    }
  };

  // Get tag name by ID
  const getTagName = (tagId: string): string => {
    const tag = tagsData.find(t => t.id === tagId);
    return tag?.name || tagId;
  };

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tagId) => (
            <span
              key={tagId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted text-sm rounded-md"
            >
              {getTagName(tagId)}
              <button
                type="button"
                onClick={() => removeTag(tagId)}
                className="text-muted-foreground hover:text-danger transition-colors"
                aria-label={`إزالة ${getTagName(tagId)}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tags limit warning */}
      {isMaxReached && (
        <div className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
          تم الوصول للحد الأقصى من الوسوم
        </div>
      )}

      {/* AI Error Alert */}
      {aiError && (
        <Alert variant="error" onClose={() => setAiError(null)} className="text-xs py-2">
          {aiError}
        </Alert>
      )}

      {/* Search Input with Dropdown */}
      <div ref={containerRef} className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={isMaxReached ? 'تم الوصول للحد الأقصى من الوسوم' : placeholder}
            disabled={isMaxReached}
            className={isMaxReached ? 'opacity-60 cursor-not-allowed flex-1' : 'flex-1'}
          />
          {canUseAi && (
            <button
              type="button"
              onClick={fetchAiSuggestions}
              disabled={aiLoading || isMaxReached}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
              title="اقتراحات الذكاء الاصطناعي"
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري التحليل...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  اقتراحات AI
                </>
              )}
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && !isMaxReached && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-80 overflow-y-auto">
            {/* AI Suggestions Section */}
            {showAiSuggestions && (aiSuggestions.length > 0 || aiLoading) && (
              <div className="border-b">
                <div className="sticky top-0 bg-primary/5 px-3 py-2 border-b border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-primary">اقتراحات الذكاء الاصطناعي</span>
                  </div>
                  {aiSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllAiTags}
                      className="text-xs text-primary hover:underline"
                    >
                      إضافة الكل
                    </button>
                  )}
                </div>
                {aiLoading ? (
                  <div className="p-4 text-center">
                    <svg className="animate-spin w-5 h-5 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs text-muted-foreground mt-2">جاري تحليل المحتوى...</p>
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <ul className="py-1">
                    {aiSuggestions
                      .filter(tag => !selectedTags.some(id => getTagName(id) === tag.name))
                      .map((tag, index) => (
                        <li key={`ai-${index}`}>
                          <button
                            type="button"
                            onClick={() => selectAiTag(tag)}
                            disabled={creatingTag}
                            className="w-full px-3 py-2.5 text-right hover:bg-primary/5 transition-colors border-l-2 border-primary"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{tag.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  tag.relevance === 'high' ? 'bg-success/10 text-success' :
                                  tag.relevance === 'medium' ? 'bg-warning/10 text-warning' :
                                  'bg-muted-foreground/10 text-muted-foreground'
                                }`}>
                                  {tag.confidence >= 0.8 ? 'عالي' : tag.confidence >= 0.5 ? 'متوسط' : 'منخفض'}
                                </span>
                              </div>
                            </div>
                            {tag.reason && (
                              <p className="text-xs text-muted-foreground mt-1 text-right">{tag.reason}</p>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    لا توجد اقتراحات متاحة
                  </div>
                )}
              </div>
            )}

            {/* Regular Search Results */}
            {!showAiSuggestions && (
              <>
                {loading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    <svg className="animate-spin w-4 h-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري البحث...
                  </div>
                ) : error ? (
                  <div className="p-3 text-sm text-danger text-center">
                    {error}
                  </div>
                ) : (
                  <>
                    {/* Suggestions */}
                    {suggestions.length > 0 ? (
                      <ul className="py-1">
                        {suggestions.map((tag) => (
                          <li key={tag.id}>
                            <button
                              type="button"
                              onClick={() => selectTag(tag)}
                              className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors flex items-center justify-between"
                            >
                              <span>{tag.name}</span>
                              {tag.articleCount !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {tag.articleCount} مقال
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : query.trim() ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        لا توجد نتائج
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        اكتب للبحث عن وسوم
                      </div>
                    )}

                    {/* Create new tag option */}
                    {canCreate && query.trim() && (
                      <div className="border-t">
                        <button
                          type="button"
                          onClick={() => createTag(query)}
                          disabled={creatingTag}
                          className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary"
                        >
                          {creatingTag ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              جاري الإنشاء...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              إنشاء وسم جديد: &ldquo;{query.trim()}&rdquo;
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* AI helper text */}
      {canUseAi && !showAiSuggestions && selectedTags.length === 0 && (
        <p className="text-xs text-muted-foreground">
          💡 انقر على &quot;اقتراحات AI&quot; للحصول على اقتراحات ذكية بناءً على محتوى مقالك
        </p>
      )}
    </div>
  );
}
