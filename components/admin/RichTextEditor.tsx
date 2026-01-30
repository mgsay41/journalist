'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
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

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  onImageInsert?: (image: ImageData) => void;
  onVideoInsert?: (video: VideoEmbedData) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'ابدأ الكتابة هنا...',
  editable = true,
  minHeight = '400px',
  onImageInsert,
  onVideoInsert,
}: RichTextEditorProps) {
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

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('أدخل الرابط:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="animate-pulse bg-muted h-96 rounded-lg"></div>;
  }

  const wordCount = editor.storage.characterCount.words();
  const characterCount = editor.storage.characterCount.characters();

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1">
          {/* Headings */}
          <div className="flex gap-1 border-l pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-muted-foreground/10' : ''}
              title="عنوان 1"
            >
              H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-muted-foreground/10' : ''}
              title="عنوان 2"
            >
              H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'bg-muted-foreground/10' : ''}
              title="عنوان 3"
            >
              H3
            </Button>
          </div>

          {/* Text Formatting */}
          <div className="flex gap-1 border-l pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-muted-foreground/10' : ''}
              title="عريض"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-muted-foreground/10' : ''}
              title="مائل"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'bg-muted-foreground/10' : ''}
              title="مشطوب"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 4h6M9 20h6" />
              </svg>
            </Button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-l pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-muted-foreground/10' : ''}
              title="قائمة نقطية"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-muted-foreground/10' : ''}
              title="قائمة رقمية"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </Button>
          </div>

          {/* Other */}
          <div className="flex gap-1 border-l pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'bg-muted-foreground/10' : ''}
              title="اقتباس"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive('codeBlock') ? 'bg-muted-foreground/10' : ''}
              title="كود"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={setLink}
              className={editor.isActive('link') ? 'bg-muted-foreground/10' : ''}
              title="رابط"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImagePicker(true)}
              title="إدراج صورة"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoPicker(true)}
              title="إدراج فيديو YouTube"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
          </div>

          {/* Clear formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            title="مسح التنسيق"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} className="bg-card" />

      {/* Footer with stats */}
      <div className="border-t bg-muted/30 px-4 py-2 text-sm text-muted-foreground flex justify-between">
        <div>
          <span>{wordCount} كلمة</span>
          <span className="mx-2">•</span>
          <span>{characterCount} حرف</span>
          <span className="mx-2">•</span>
          <span>قراءة {Math.ceil(wordCount / 200)} دقيقة</span>
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            مسح الكل
          </Button>
        )}
      </div>

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
    </div>
  );
}

// Custom styles for TipTap editor
export const richTextEditorStyles = `
  /* Basic editor styles */
  .ProseMirror {
    outline: none;
  }

  /* Placeholder styles */
  .ProseMirror.is-editor-empty:before {
    content: attr(data-placeholder);
    float: right;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  /* Heading styles */
  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  /* List styles */
  .ProseMirror ul,
  .ProseMirror ol {
    padding-right: 1.5em;
  }

  /* Blockquote styles */
  .ProseMirror blockquote {
    border-right: 3px solid currentColor;
    padding-right: 1rem;
    margin: 1.5rem 0;
    color: #71717a;
  }

  /* Code block styles */
  .ProseMirror pre {
    background: #f4f4f5;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    direction: ltr;
    text-align: left;
    margin: 1.5rem 0;
  }

  .ProseMirror code {
    background: #f4f4f5;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    direction: ltr;
    display: inline-block;
  }

  /* Link styles */
  .ProseMirror a {
    color: #2563eb;
    text-decoration: underline;
  }

  /* Image styles */
  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1.5rem auto;
    display: block;
  }

  .ProseMirror img.ProseMirror-selectednode {
    outline: 2px solid #000;
    outline-offset: 2px;
  }

  /* YouTube embed styles */
  .ProseMirror .youtube-embed {
    margin: 1.5rem 0;
  }

  .ProseMirror .youtube-embed iframe {
    border-radius: 0.5rem;
  }

  .ProseMirror [data-youtube-video] {
    margin: 1.5rem 0;
  }

  .ProseMirror [data-youtube-video].ProseMirror-selectednode {
    outline: 2px solid #000;
    outline-offset: 4px;
    border-radius: 0.5rem;
  }

  /* Selected text */
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: right;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }
`;
