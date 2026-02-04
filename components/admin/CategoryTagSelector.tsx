'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

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

interface CategoryTagSelectorProps {
  suggestedCategories: SuggestedCategory[];
  suggestedTags: SuggestedTag[];
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
  selectedCategoryIds: string[];
  selectedTagIds: string[];
  newTagNames: string[];
  newCategoryNames: string[];
  onCategoriesChange: (ids: string[], newNames: string[]) => void;
  onTagsChange: (ids: string[], newNames: string[]) => void;
  maxTags?: number;
}

export function CategoryTagSelector({
  suggestedCategories,
  suggestedTags,
  availableCategories,
  availableTags,
  selectedCategoryIds,
  selectedTagIds,
  newTagNames,
  newCategoryNames,
  onCategoriesChange,
  onTagsChange,
  maxTags = 10,
}: CategoryTagSelectorProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  // Toggle category selection
  const toggleCategory = (category: SuggestedCategory) => {
    if (category.isExisting && category.id) {
      // Existing category
      if (selectedCategoryIds.includes(category.id)) {
        onCategoriesChange(selectedCategoryIds.filter(id => id !== category.id), newCategoryNames);
      } else {
        onCategoriesChange([...selectedCategoryIds, category.id], newCategoryNames);
      }
    } else {
      // New category
      if (newCategoryNames.includes(category.name)) {
        onCategoriesChange(selectedCategoryIds, newCategoryNames.filter(n => n !== category.name));
      } else {
        onCategoriesChange(selectedCategoryIds, [...newCategoryNames, category.name]);
      }
    }
  };

  // Check if category is selected
  const isCategorySelected = (category: SuggestedCategory) => {
    if (category.isExisting && category.id) {
      return selectedCategoryIds.includes(category.id);
    }
    return newCategoryNames.includes(category.name);
  };

  // Toggle tag selection
  const toggleTag = (tag: SuggestedTag) => {
    if (tag.isExisting && tag.id) {
      // Existing tag
      if (selectedTagIds.includes(tag.id)) {
        onTagsChange(selectedTagIds.filter(id => id !== tag.id), newTagNames);
      } else if (selectedTagIds.length + newTagNames.length < maxTags) {
        onTagsChange([...selectedTagIds, tag.id], newTagNames);
      }
    } else {
      // New tag
      if (newTagNames.includes(tag.name)) {
        onTagsChange(selectedTagIds, newTagNames.filter(n => n !== tag.name));
      } else if (selectedTagIds.length + newTagNames.length < maxTags) {
        onTagsChange(selectedTagIds, [...newTagNames, tag.name]);
      }
    }
  };

  // Check if tag is selected
  const isTagSelected = (tag: SuggestedTag) => {
    if (tag.isExisting && tag.id) {
      return selectedTagIds.includes(tag.id);
    }
    return newTagNames.includes(tag.name);
  };

  // Get relevance badge color
  const getRelevanceBadge = (relevance: 'high' | 'medium' | 'low') => {
    switch (relevance) {
      case 'high':
        return 'bg-success/20 text-success';
      case 'medium':
        return 'bg-warning/20 text-warning';
      case 'low':
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get confidence percentage display
  const getConfidenceDisplay = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const totalSelectedTags = selectedTagIds.length + newTagNames.length;

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Categories Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              التصنيفات
            </h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {selectedCategoryIds.length + newCategoryNames.length} مختار
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((category, index) => {
              const isSelected = isCategorySelected(category);

              return (
                <button
                  key={`${category.name}-${index}`}
                  onClick={() => toggleCategory(category)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                    }
                  `}
                  title={category.reason || ''}
                >
                  {category.name}
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!category.isExisting && (
                    <span className="text-xs bg-warning/20 text-warning px-1 rounded">جديد</span>
                  )}
                  <span className="text-xs opacity-60">
                    {getConfidenceDisplay(category.confidence)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Show more categories button */}
          {availableCategories.length > suggestedCategories.length && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
            >
              {showAllCategories ? 'إخفاء' : 'عرض الكل'}
              <svg
                className={`w-4 h-4 transition-transform ${showAllCategories ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* All categories (when expanded) */}
          {showAllCategories && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {availableCategories
                  .filter(cat => !suggestedCategories.some(s => s.id === cat.id))
                  .map(category => {
                    const isSelected = selectedCategoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          if (isSelected) {
                            onCategoriesChange(selectedCategoryIds.filter(id => id !== category.id), newCategoryNames);
                          } else {
                            onCategoriesChange([...selectedCategoryIds, category.id], newCategoryNames);
                          }
                        }}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                          transition-all duration-200
                          ${isSelected
                            ? 'bg-primary text-white'
                            : 'bg-muted/50 hover:bg-muted text-foreground/70'
                          }
                        `}
                      >
                        {category.name}
                        {isSelected && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              الوسوم
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              totalSelectedTags >= maxTags
                ? 'bg-danger/20 text-danger'
                : 'bg-muted text-muted-foreground'
            }`}>
              {totalSelectedTags} / {maxTags}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag, index) => {
              const isSelected = isTagSelected(tag);
              const isDisabled = !isSelected && totalSelectedTags >= maxTags;

              return (
                <button
                  key={`${tag.name}-${index}`}
                  onClick={() => !isDisabled && toggleTag(tag)}
                  disabled={isDisabled}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : isDisabled
                        ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }
                  `}
                >
                  {tag.name}
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!tag.isExisting && (
                    <span className="text-xs bg-success/20 text-success px-1 rounded">جديد</span>
                  )}
                  <span className={`text-xs px-1 rounded ${getRelevanceBadge(tag.relevance)}`}>
                    {tag.relevance === 'high' ? 'مهم' : tag.relevance === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Show more tags button */}
          {availableTags.length > suggestedTags.length && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
            >
              {showAllTags ? 'إخفاء' : 'عرض الكل'}
              <svg
                className={`w-4 h-4 transition-transform ${showAllTags ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* All tags (when expanded) */}
          {showAllTags && (
            <div className="mt-3 pt-3 border-t border-border max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !suggestedTags.some(s => s.id === tag.id))
                  .slice(0, 50) // Limit for performance
                  .map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    const isDisabled = !isSelected && totalSelectedTags >= maxTags;

                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (isDisabled) return;
                          if (isSelected) {
                            onTagsChange(selectedTagIds.filter(id => id !== tag.id), newTagNames);
                          } else {
                            onTagsChange([...selectedTagIds, tag.id], newTagNames);
                          }
                        }}
                        disabled={isDisabled}
                        className={`
                          inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs
                          transition-all duration-200
                          ${isSelected
                            ? 'bg-primary text-white'
                            : isDisabled
                              ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                              : 'bg-muted/50 hover:bg-muted text-foreground/70'
                          }
                        `}
                      >
                        {tag.name}
                        {isSelected && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default CategoryTagSelector;
