'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

export interface SeoSuggestionOptions {
  HTMLAttributes: Record<string, unknown>;
}

export type SeoSuggestionType =
  | 'add-keyword'
  | 'improve-heading'
  | 'add-link'
  | 'shorten-paragraph'
  | 'improve-readability'
  | 'add-alt-text';

export interface SeoSuggestionAttributes {
  id: string;
  type: SeoSuggestionType;
  suggestedText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    seoSuggestion: {
      /**
       * Set an SEO suggestion mark
       */
      setSeoSuggestion: (attributes: SeoSuggestionAttributes) => ReturnType;
      /**
       * Toggle an SEO suggestion mark
       */
      toggleSeoSuggestion: (attributes: SeoSuggestionAttributes) => ReturnType;
      /**
       * Unset an SEO suggestion mark
       */
      unsetSeoSuggestion: () => ReturnType;
      /**
       * Remove a specific SEO suggestion by ID
       */
      removeSeoSuggestion: (id: string) => ReturnType;
      /**
       * Accept and apply an SEO suggestion
       */
      applySeoSuggestion: (id: string, suggestedText: string) => ReturnType;
      /**
       * Remove all SEO suggestion marks
       */
      clearAllSeoSuggestions: () => ReturnType;
    };
  }
}

export const SeoSuggestionExtension = Mark.create<SeoSuggestionOptions>({
  name: 'seoSuggestion',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-suggestion-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { 'data-suggestion-id': attributes.id };
        },
      },
      type: {
        default: 'add-keyword',
        parseHTML: (element) => element.getAttribute('data-suggestion-type'),
        renderHTML: (attributes) => {
          return { 'data-suggestion-type': attributes.type };
        },
      },
      suggestedText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-suggested-text'),
        renderHTML: (attributes) => {
          if (!attributes.suggestedText) return {};
          return { 'data-suggested-text': attributes.suggestedText };
        },
      },
      reason: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-reason'),
        renderHTML: (attributes) => {
          if (!attributes.reason) return {};
          return { 'data-reason': attributes.reason };
        },
      },
      priority: {
        default: 'medium',
        parseHTML: (element) => element.getAttribute('data-priority'),
        renderHTML: (attributes) => {
          return { 'data-priority': attributes.priority };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-seo-suggestion]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const priority = HTMLAttributes['data-priority'] || 'medium';

    // Different classes based on priority
    const priorityClasses: Record<string, string> = {
      high: 'seo-suggestion seo-suggestion-high',
      medium: 'seo-suggestion seo-suggestion-medium',
      low: 'seo-suggestion seo-suggestion-low',
    };

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-seo-suggestion': '',
        class: priorityClasses[priority] || 'seo-suggestion',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSeoSuggestion:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleSeoSuggestion:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetSeoSuggestion:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      removeSeoSuggestion:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks.filter(
                (mark) => mark.type.name === this.name && mark.attrs.id === id
              );
              if (marks.length > 0) {
                found = true;
                if (dispatch) {
                  tr.removeMark(pos, pos + node.nodeSize, marks[0].type);
                }
              }
            }
          });

          return found;
        },
      applySeoSuggestion:
        (id: string, suggestedText: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks.filter(
                (mark) => mark.type.name === this.name && mark.attrs.id === id
              );
              if (marks.length > 0) {
                found = true;
                if (dispatch) {
                  // Replace the text with the suggestion and remove the mark
                  const end = pos + node.nodeSize;
                  tr.replaceWith(pos, end, state.schema.text(suggestedText));
                }
              }
            }
          });

          return found;
        },
      clearAllSeoSuggestions:
        () =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const markType = state.schema.marks[this.name];

          if (dispatch && markType) {
            tr.removeMark(0, doc.content.size, markType);
          }

          return true;
        },
    };
  },
});

// CSS styles for SEO suggestions - add to your global styles
export const seoSuggestionStyles = `
  /* Base SEO suggestion style */
  .seo-suggestion {
    cursor: pointer;
    position: relative;
    border-radius: 2px;
    transition: background-color 0.15s ease;
  }

  .seo-suggestion:hover {
    background-color: rgba(34, 197, 94, 0.2);
  }

  /* High priority - stronger green highlight */
  .seo-suggestion-high {
    background-color: rgba(34, 197, 94, 0.15);
    border-bottom: 2px solid #22c55e;
  }

  .seo-suggestion-high:hover {
    background-color: rgba(34, 197, 94, 0.25);
  }

  /* Medium priority - moderate green highlight */
  .seo-suggestion-medium {
    background-color: rgba(34, 197, 94, 0.1);
    border-bottom: 1px dashed #22c55e;
  }

  .seo-suggestion-medium:hover {
    background-color: rgba(34, 197, 94, 0.2);
  }

  /* Low priority - subtle green highlight */
  .seo-suggestion-low {
    background-color: rgba(34, 197, 94, 0.05);
    border-bottom: 1px dotted #22c55e;
  }

  .seo-suggestion-low:hover {
    background-color: rgba(34, 197, 94, 0.15);
  }
`;

export default SeoSuggestionExtension;
