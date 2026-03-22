'use client';

/**
 * Mobile-Optimized Article Editor
 * Integrates all mobile enhancements: bottom toolbar, voice input, camera, etc.
 */

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { MobileEditorToolbar } from './MobileEditorToolbar';
import { MobileQuickActions } from './MobileQuickActions';
import { PullToRefresh } from './MobilePullToRefresh';
import { cn } from '@/lib/utils';
import ImagePickerModal from './ImagePickerModal';
import VideoPickerModal from './VideoPickerModal';
import YouTubeExtension from './YouTubeEmbed';

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

interface Article {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  slug?: string;
  scheduledAt?: Date | null;
}

export interface MobileArticleEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  focus: () => void;
}

interface MobileArticleEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  article?: Article | null;
  onRefresh?: () => Promise<void>;
  onPublish?: () => Promise<void>;
  onSchedule?: (date: Date) => Promise<void>;
  onArchive?: () => Promise<void>;
  onPreview?: () => void;
  onImageInsert?: (image: ImageData) => void;
  onVideoInsert?: (video: VideoEmbedData) => void;
  className?: string;
}

export const MobileArticleEditor = forwardRef<MobileArticleEditorRef, MobileArticleEditorProps>(
  function MobileArticleEditor({
    content,
    onChange,
    placeholder = 'ابدأ الكتابة هنا...',
    article = null,
    onRefresh,
    onPublish,
    onSchedule,
    onArchive,
    onPreview,
    onImageInsert,
    onVideoInsert,
    className = '',
  }, ref) {
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showVideoPicker, setShowVideoPicker] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    // Detect mobile device
    useEffect(() => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          bulletList: { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
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
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-lg max-w-none focus:outline-none px-4 py-3 mobile-editor-content',
          style: 'direction: rtl; text-align: right; min-height: 300px; padding-bottom: 120px;', // Extra padding for bottom toolbar
        },
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getContent: () => editor?.getHTML() || '',
      setContent: (html: string) => editor?.commands.setContent(html),
      focus: () => editor?.view.focus(),
    }), [editor]);

    // Handle voice input
    const handleVoiceInput = useCallback((text: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(text + ' ').run();
    }, [editor]);

    // Handle camera capture
    const handleCameraCapture = useCallback(async (file: File, preview: string) => {
      if (!editor) return;

      // Create temporary image data URL for preview
      const imageUrl = URL.createObjectURL(file);

      // Insert image into editor
      editor.chain().focus().setImage({ src: imageUrl }).run();

      // If callback provided, upload the image
      if (onImageInsert) {
        // Create image data object
        const imageData: ImageData = {
          id: 'temp-' + Date.now(),
          url: imageUrl,
          thumbnailUrl: imageUrl,
          mediumUrl: imageUrl,
          largeUrl: imageUrl,
          altText: null,
          caption: null,
          filename: file.name,
          fileSize: file.size,
          width: 0,
          height: 0,
          mimeType: file.type,
        };

        try {
          await onImageInsert(imageData);
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }
    }, [editor, onImageInsert]);

    // Handle image insertion from picker
    const handleImageInsert = useCallback((image: ImageData) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: image.largeUrl || image.url }).run();
      setShowImagePicker(false);
    }, [editor]);

    // Handle video insertion from picker
    const handleVideoInsert = useCallback((video: VideoEmbedData) => {
      if (!editor) return;

      // Insert YouTube embed
      editor.chain().focus().insertContent({
        type: 'youtubeVideo',
        attrs: {
          videoId: video.videoId,
          title: video.title || '',
          privacyMode: video.privacyMode,
          startTime: video.startTime || 0,
        },
      }).run();

      setShowVideoPicker(false);
    }, [editor]);

    // Handle link insertion
    const handleLinkClick = useCallback(() => {
      if (!editor) return;

      const url = window.prompt('أدخل الرابط:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }, [editor]);

    const editorContent = (
      <div className="relative bg-background rounded-xl border-2 border-border overflow-hidden focus-within:border-primary transition-colors">
        <EditorContent editor={editor} ref={contentRef} />
      </div>
    );

    // Desktop view (no mobile toolbar)
    if (!isMobile) {
      return (
        <div className={cn('space-y-4', className)}>
          {editorContent}
        </div>
      );
    }

    // Mobile view with bottom toolbar
    return (
      <div className={cn('relative', className)}>
        {/* Pull to refresh wrapper */}
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh}>
            {editorContent}
          </PullToRefresh>
        ) : (
          editorContent
        )}

        {/* Image picker modal */}
        {showImagePicker && (
          <ImagePickerModal
            isOpen={showImagePicker}
            onClose={() => setShowImagePicker(false)}
            onSelect={handleImageInsert}
          />
        )}

        {/* Video picker modal */}
        {showVideoPicker && (
          <VideoPickerModal
            isOpen={showVideoPicker}
            onClose={() => setShowVideoPicker(false)}
            onSelect={handleVideoInsert}
          />
        )}

        {/* Mobile bottom toolbar */}
        <MobileEditorToolbar
          editor={editor}
          onVoiceInput={handleVoiceInput}
          onCameraCapture={handleCameraCapture}
          onImageClick={() => setShowImagePicker(true)}
          onVideoClick={() => setShowVideoPicker(true)}
          onLinkClick={handleLinkClick}
        />

        {/* Quick actions for publish/status */}
        {(onPublish || onSchedule || onArchive || onPreview) && (
          <MobileQuickActions
            article={article}
            onPublish={onPublish}
            onSchedule={onSchedule}
            onArchive={onArchive}
            onPreview={onPreview}
            variant="floating"
          />
        )}
      </div>
    );
  }
);

export default MobileArticleEditor;
