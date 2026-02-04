'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

export interface GrammarErrorOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface GrammarErrorAttributes {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  correction: string;
  explanation: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    grammarError: {
      /**
       * Set a grammar error mark
       */
      setGrammarError: (attributes: GrammarErrorAttributes) => ReturnType;
      /**
       * Toggle a grammar error mark
       */
      toggleGrammarError: (attributes: GrammarErrorAttributes) => ReturnType;
      /**
       * Unset a grammar error mark
       */
      unsetGrammarError: () => ReturnType;
      /**
       * Remove a specific grammar error by ID
       */
      removeGrammarError: (id: string) => ReturnType;
      /**
       * Apply correction for a grammar error
       */
      applyGrammarCorrection: (id: string, correction: string) => ReturnType;
      /**
       * Remove all grammar error marks
       */
      clearAllGrammarErrors: () => ReturnType;
    };
  }
}

export const GrammarErrorExtension = Mark.create<GrammarErrorOptions>({
  name: 'grammarError',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-error-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { 'data-error-id': attributes.id };
        },
      },
      type: {
        default: 'grammar',
        parseHTML: (element) => element.getAttribute('data-error-type'),
        renderHTML: (attributes) => {
          return { 'data-error-type': attributes.type };
        },
      },
      correction: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-correction'),
        renderHTML: (attributes) => {
          if (!attributes.correction) return {};
          return { 'data-correction': attributes.correction };
        },
      },
      explanation: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-explanation'),
        renderHTML: (attributes) => {
          if (!attributes.explanation) return {};
          return { 'data-explanation': attributes.explanation };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-grammar-error]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const errorType = HTMLAttributes['data-error-type'] || 'grammar';

    // Different classes based on error type
    const typeClasses: Record<string, string> = {
      spelling: 'grammar-error grammar-error-spelling',
      grammar: 'grammar-error grammar-error-grammar',
      punctuation: 'grammar-error grammar-error-punctuation',
      style: 'grammar-error grammar-error-style',
    };

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-grammar-error': '',
        class: typeClasses[errorType] || 'grammar-error',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setGrammarError:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleGrammarError:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetGrammarError:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      removeGrammarError:
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
      applyGrammarCorrection:
        (id: string, correction: string) =>
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
                  // Replace the text with the correction and remove the mark
                  const end = pos + node.nodeSize;
                  tr.replaceWith(pos, end, state.schema.text(correction));
                }
              }
            }
          });

          return found;
        },
      clearAllGrammarErrors:
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

// CSS styles for grammar errors - add to your global styles
export const grammarErrorStyles = `
  /* Base grammar error style */
  .grammar-error {
    cursor: pointer;
    position: relative;
    text-decoration-style: wavy;
    text-decoration-line: underline;
    text-underline-offset: 3px;
    transition: background-color 0.15s ease;
  }

  .grammar-error:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

  /* Spelling errors - red wavy underline */
  .grammar-error-spelling {
    text-decoration-color: #ef4444;
  }

  /* Grammar errors - orange wavy underline */
  .grammar-error-grammar {
    text-decoration-color: #f97316;
  }

  /* Punctuation errors - yellow wavy underline */
  .grammar-error-punctuation {
    text-decoration-color: #eab308;
  }

  /* Style suggestions - blue wavy underline */
  .grammar-error-style {
    text-decoration-color: #3b82f6;
  }
`;

export default GrammarErrorExtension;
