'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import ImagePickerModal from './ImagePickerModal';
import VideoPickerModal from './VideoPickerModal';
import YouTubeExtension from './YouTubeEmbed';
import { EditorToolbar } from './editor/EditorToolbar';
import { EditorStats } from './editor/EditorStats';
import { EditorStyles } from './editor/EditorStyles';
import {
  GrammarErrorExtension,
  SeoSuggestionExtension,
  AiEditExtension,
  SuggestionTooltip,
  type GrammarErrorAttributes,
  type SeoSuggestionAttributes,
  type AiEditAttributes,
} from './editor';
import type { AiEditMark } from '@/lib/ai/diff-utils';

interface ImageData {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  altText: string | null;
  caption: string | null;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
}

interface VideoEmbedData {
  videoId: string;
  title?: string;
  privacyMode: boolean;
  startTime: number;
}

interface GrammarIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  original: string;
  correction: string;
  explanation: string;
  position?: { from: number; to: number };
}

interface SeoSuggestion {
  id: string;
  type: string;
  original: string;
  suggestedText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  position?: { from: number; to: number };
}

export interface RichTextEditorRef {
  getEditor: () => Editor | null;
  applyGrammarMarks: (issues: GrammarIssue[]) => void;
  applySeoMarks: (suggestions: SeoSuggestion[]) => void;
  clearAllMarks: () => void;
  applyAiEditMarks: (marks: AiEditMark[]) => void;
  acceptAllAiEdits: () => void;
  rejectAllAiEdits: () => void;
  clearAllAiEdits: () => void;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  onImageInsert?: (image: ImageData) => void;
  onVideoInsert?: (video: VideoEmbedData) => void;
  // Inline suggestions
  enableInlineSuggestions?: boolean;
  onApplyGrammarCorrection?: (id: string, correction: string) => void;
  onIgnoreGrammarError?: (id: string) => void;
  onApplySeoSuggestion?: (id: string, suggestedText: string) => void;
  onIgnoreSeoSuggestion?: (id: string) => void;
  // AI edit callbacks
  onAcceptAiEdit?: (id: string) => void;
  onRejectAiEdit?: (id: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(function RichTextEditor({
  content,
  onChange,
  placeholder = 'ابدأ الكتابة هنا...',
  editable = true,
  minHeight = '400px',
  onImageInsert,
  onVideoInsert,
  enableInlineSuggestions = false,
  onApplyGrammarCorrection,
  onIgnoreGrammarError,
  onApplySeoSuggestion,
  onIgnoreSeoSuggestion,
  onAcceptAiEdit,
  onRejectAiEdit,
}, ref) {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto mx-auto my-4',
        },
      }),
      YouTubeExtension,
      AiEditExtension,
      // Inline suggestion extensions (only add if enabled)
      ...(enableInlineSuggestions ? [GrammarErrorExtension, SeoSuggestionExtension] : []),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-4 py-3',
        style: `min-height: ${minHeight}; direction: rtl; text-align: right;`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Helper function to find text position in the editor
  const findTextPosition = useCallback((searchText: string, startFrom = 0): { from: number; to: number } | null => {
    if (!editor) return null;

    const doc = editor.state.doc;
    let found: { from: number; to: number } | null = null;

    doc.descendants((node, pos) => {
      if (found) return false; // Stop if already found
      if (node.isText && node.text) {
        const index = node.text.indexOf(searchText, pos >= startFrom ? 0 : startFrom - pos);
        if (index !== -1) {
          const from = pos + index;
          const to = from + searchText.length;
          if (from >= startFrom) {
            found = { from, to };
            return false; // Stop searching
          }
        }
      }
    });

    return found;
  }, [editor]);

  const findBlockPosition = useCallback(
    (searchText: string): { from: number; to: number } | null => {
      if (!editor) return null;
      const doc = editor.state.doc;
      let found: { from: number; to: number } | null = null;
      const prefix = searchText.substring(0, 40).trim();

      doc.descendants((node, pos) => {
        if (found) return false;
        if (node.isBlock && !node.isText && node.textContent) {
          if (node.textContent.trim().startsWith(prefix)) {
            found = { from: pos + 1, to: pos + node.nodeSize - 1 };
            return false;
          }
        }
      });

      return found;
    },
    [editor],
  );

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,

    applyGrammarMarks: (issues: GrammarIssue[]) => {
      if (!editor || !enableInlineSuggestions) return;

      // Clear existing grammar marks first
      editor.commands.clearAllGrammarErrors();

      // Apply new marks
      issues.forEach((issue) => {
        // Find the text in the document
        const position = issue.position || findTextPosition(issue.original);
        if (position) {
          editor
            .chain()
            .setTextSelection(position)
            .setGrammarError({
              id: issue.id,
              type: issue.type,
              correction: issue.correction,
              explanation: issue.explanation,
            })
            .run();
        }
      });

      // Reset selection
      editor.commands.blur();
    },

    applySeoMarks: (suggestions: SeoSuggestion[]) => {
      if (!editor || !enableInlineSuggestions) return;

      // Clear existing SEO marks first
      editor.commands.clearAllSeoSuggestions();

      // Apply new marks
      suggestions.forEach((suggestion) => {
        // Find the text in the document
        const position = suggestion.position || findTextPosition(suggestion.original);
        if (position) {
          editor
            .chain()
            .setTextSelection(position)
            .setSeoSuggestion({
              id: suggestion.id,
              type: suggestion.type as SeoSuggestionAttributes['type'],
              suggestedText: suggestion.suggestedText,
              reason: suggestion.reason,
              priority: suggestion.priority,
            })
            .run();
        }
      });

      // Reset selection
      editor.commands.blur();
    },

    clearAllMarks: () => {
      if (!editor || !enableInlineSuggestions) return;
      editor.commands.clearAllGrammarErrors();
      editor.commands.clearAllSeoSuggestions();
    },

    applyAiEditMarks: (marks: AiEditMark[]) => {
      if (!editor) return;

      editor.commands.clearAllAiEdits();

      marks.forEach((mark) => {
        const searchText = mark.aiText.substring(0, 80);
        const position = findBlockPosition(searchText);
        if (position) {
          editor
            .chain()
            .setTextSelection(position)
            .setAiEdit({
              id: mark.id,
              originalText: mark.originalText,
              aiText: mark.aiText,
            })
            .run();
        }
      });

      editor.commands.blur();
    },

    acceptAllAiEdits: () => {
      if (!editor) return;
      editor.commands.acceptAllAiEdits();
    },

    rejectAllAiEdits: () => {
      if (!editor) return;
      editor.commands.rejectAllAiEdits();
    },

    clearAllAiEdits: () => {
      if (!editor) return;
      editor.commands.clearAllAiEdits();
    },
  }), [editor, enableInlineSuggestions, findTextPosition, findBlockPosition]);

  // Handle image selection from picker
  const handleImageSelect = useCallback((image: ImageData) => {
    if (!editor) return;

    // Use medium or large URL for content, fallback to original
    const imageUrl = image.mediumUrl || image.largeUrl || image.url;

    editor.chain().focus().setImage({
      src: imageUrl,
      alt: image.altText || image.filename,
      title: image.caption || undefined,
    }).run();

    // Notify parent component if callback is provided
    if (onImageInsert) {
      onImageInsert(image);
    }

    setShowImagePicker(false);
  }, [editor, onImageInsert]);

  // Handle video selection from picker
  const handleVideoSelect = useCallback((video: VideoEmbedData) => {
    if (!editor) return;

    // Insert YouTube video using the custom extension
    editor.chain().focus().insertContent({
      type: 'youtube',
      attrs: {
        src: `https://www.youtube.com/watch?v=${video.videoId}`,
        videoId: video.videoId,
        title: video.title || null,
        privacyMode: video.privacyMode,
        startTime: video.startTime,
      },
    }).run();

    // Notify parent component if callback is provided
    if (onVideoInsert) {
      onVideoInsert(video);
    }

    setShowVideoPicker(false);
  }, [editor, onVideoInsert]);

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="animate-pulse bg-muted h-96 rounded-lg"></div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Inject editor styles */}
      <EditorStyles />

      {/* Toolbar - hidden on mobile */}
      {editable && (
        <div className="hidden md:block">
          <EditorToolbar
            editor={editor}
            onInsertImage={() => setShowImagePicker(true)}
            onInsertVideo={() => setShowVideoPicker(true)}
          />
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} className="bg-card" />

      {/* Footer with stats */}
      <EditorStats editor={editor} editable={editable} />

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleImageSelect}
        title="إدراج صورة"
      />

      {/* Video Picker Modal */}
      <VideoPickerModal
        isOpen={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        onSelect={handleVideoSelect}
        title="إدراج فيديو YouTube"
      />

      {/* Suggestion Tooltip for inline grammar/SEO suggestions */}
      {enableInlineSuggestions && (
        <SuggestionTooltip
          editor={editor}
          onApplyGrammarCorrection={onApplyGrammarCorrection}
          onIgnoreGrammarError={onIgnoreGrammarError}
          onApplySeoSuggestion={onApplySeoSuggestion}
          onIgnoreSeoSuggestion={onIgnoreSeoSuggestion}
          onAcceptAiEdit={onAcceptAiEdit}
          onRejectAiEdit={onRejectAiEdit}
        />
      )}
    </div>
  );
});

// Re-export styles for backward compatibility
export { editorStyles as richTextEditorStyles } from './editor/EditorStyles';

