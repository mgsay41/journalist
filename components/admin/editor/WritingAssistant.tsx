import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReactNodeView, NodeViewWrapper } from '@tiptap/react';
import * as React from 'react';

// Types for AI suggestions
export interface AiSuggestionAttributes {
  id: string;
  type: 'autocomplete' | 'improve-word' | 'fix-passive' | 'suggest-transitions' | 'expand-text' | 'summarize-text';
  suggestion: string;
  confidence?: number;
  reason?: string;
}

// Declare the extension storage
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    writingAssistant: {
      /**
       * Show AI suggestion popup
       */
      showAiSuggestion: (suggestion: AiSuggestionAttributes) => ReturnType;
      /**
       * Hide AI suggestion popup
       */
      hideAiSuggestion: () => ReturnType;
      /**
       * Apply AI suggestion
       */
      applyAiSuggestion: (suggestion: string) => ReturnType;
    };
  }
}

// Create the WritingAssistant extension
export const WritingAssistantExtension = Extension.create({
  name: 'writingAssistant',

  addOptions() {
    return {
      onSuggestionApply: null,
      onSuggestionDismiss: null,
    };
  },

  addCommands() {
    return {
      showAiSuggestion:
        (suggestion: AiSuggestionAttributes) =>
        ({ view, state }) => {
          const { from, to } = state.selection;
          const decoration = Decoration.inline(from, to, {
            class: 'ai-suggestion-highlight',
            'data-suggestion-id': suggestion.id,
            'data-suggestion-type': suggestion.type,
          });

          const decorations = DecorationSet.create(state.doc, [decoration]);

          // Store the suggestion in the editor's stored marks
          (this as any).suggestionData = suggestion;
          (this as any).suggestionDecorations = decorations;

          // Emit event
          const event = new CustomEvent('ai-suggestion-show', {
            detail: { suggestion, from, to },
          });
          view.dom.dispatchEvent(event);

          return true;
        },

      hideAiSuggestion:
        () =>
        ({ view }) => {
          (this as any).suggestionData = null;
          (this as any).suggestionDecorations = null;

          const event = new CustomEvent('ai-suggestion-hide');
          view.dom.dispatchEvent(event);

          return true;
        },

      applyAiSuggestion:
        (suggestion: string) =>
        ({ view, state, dispatch }) => {
          const { from, to } = state.selection;

          if (dispatch) {
            const tr = state.tr.insertText(suggestion, from, to);
            view.dispatch(tr);
          }

          // Hide suggestion after applying
          view.dispatch(
            state.tr.setMeta('hide-ai-suggestion', true)
          );

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('writingAssistant');

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return {
              suggestion: null as AiSuggestionAttributes | null,
              position: null as { from: number; to: number } | null,
            };
          },
          apply(tr, value) {
            // Check for hide suggestion metadata
            if (tr.getMeta('hide-ai-suggestion')) {
              return { suggestion: null, position: null };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            // Create decorations from stored marks
            const decorations: Decoration[] = [];
            const suggestion = (this as any).suggestionData;

            if (suggestion && (this as any).suggestionDecorations) {
              return (this as any).suggestionDecorations;
            }

            return DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

// Floating Menu Component for AI Suggestions
interface WritingAssistantMenuProps {
  editor: any;
  suggestion: AiSuggestionAttributes | null;
  position: { from: number; to: number } | null;
  onApply: (suggestion: string) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export const WritingAssistantMenu = React.memo(function WritingAssistantMenu({
  suggestion,
  position,
  onApply,
  onDismiss,
  loading = false,
}: WritingAssistantMenuProps) {
  if (!suggestion || !position) return null;

  const typeLabels: Record<string, string> = {
    'autocomplete': 'إكمال تلقائي',
    'improve-word': 'تحسين الكلمة',
    'fix-passive': 'تصحيح الصياغة',
    'suggest-transitions': 'كلمات انتقالية',
    'expand-text': 'توسيع النص',
    'summarize-text': 'تلخيص النص',
  };

  return (
    <div className="writing-assistant-menu fixed z-50 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[280px] max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-foreground">
            {typeLabels[suggestion.type] || 'اقتراح ذكي'}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="إغلاق"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="py-2">
            <p className="text-sm text-foreground">{suggestion.suggestion}</p>
            {suggestion.reason && (
              <p className="text-xs text-muted-foreground mt-2">{suggestion.reason}</p>
            )}
          </div>

          {/* Footer with confidence and actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {suggestion.confidence !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">الثقة:</span>
                <span className={`text-xs font-medium ${
                  suggestion.confidence >= 0.8 ? 'text-success' :
                  suggestion.confidence >= 0.5 ? 'text-warning' : 'text-danger'
                }`}>
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                تجاهل
              </button>
              <button
                type="button"
                onClick={() => onApply(suggestion.suggestion)}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                تطبيق
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// AI Writing Toolbar Component
interface AiWritingToolbarProps {
  onAction: (action: string, data: any) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const AiWritingToolbar = React.memo(function AiWritingToolbar({
  onAction,
  loading = false,
  disabled = false,
}: AiWritingToolbarProps) {
  const actions = [
    { id: 'autocomplete', label: 'إكمال', icon: '⌨️', shortcut: 'Ctrl+Space', description: 'إكمال الجملة' },
    { id: 'improve-word', label: 'تحسين', icon: '✨', shortcut: 'Ctrl+K', description: 'تحسين الكلمة' },
    { id: 'fix-passive', label: 'نشط', icon: '🔄', shortcut: 'Ctrl+Shift+P', description: 'تحويل للمبني للمعلوم' },
    { id: 'suggest-transitions', label: 'انتقال', icon: '🔗', shortcut: 'Ctrl+Shift+T', description: 'كلمات انتقالية' },
    { id: 'expand-text', label: 'توسيع', icon: '📝', shortcut: 'Ctrl+E', description: 'توسيع النص' },
    { id: 'summarize-text', label: 'تلخيص', icon: '📋', shortcut: 'Ctrl+Shift+S', description: 'تلخيص النص' },
  ];

  return (
    <div className="ai-writing-toolbar flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action.id, {})}
          disabled={disabled || loading}
          className="group relative px-2.5 py-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={`${action.description} (${action.shortcut})`}
        >
          <span className="text-sm">{action.icon}</span>
          <span className="text-xs mr-1.5 hidden group-hover:inline">{action.label}</span>

          {/* Tooltip */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {action.description}
            <span className="block text-[10px] opacity-75 mt-0.5">{action.shortcut}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

// CSS for the writing assistant
export const writingAssistantStyles = `
/* AI Suggestion Highlight */
.ai-suggestion-highlight {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
  border-bottom: 2px dashed #a855f7;
  cursor: pointer;
  position: relative;
}

.ai-suggestion-highlight::after {
  content: '✨';
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  opacity: 0.7;
}

/* Writing Assistant Menu */
.writing-assistant-menu {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ai-suggestion-highlight {
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2));
  }
}

/* RTL support */
.writing-assistant-menu[dir="rtl"] {
  direction: rtl;
}
`;
