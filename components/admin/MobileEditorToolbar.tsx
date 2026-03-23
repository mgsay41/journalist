'use client';

/**
 * Mobile Editor Bottom Toolbar
 * Provides easy thumb access to formatting and media tools on mobile
 */

import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { VoiceInputButton } from './VoiceInputButton';
import { CameraUploadButton } from './CameraUploadButton';
import { useHaptic } from '@/lib/mobile/haptic-feedback';
import { cn } from '@/lib/utils';

interface MobileEditorToolbarProps {
  editor: Editor | null;
  onVoiceInput?: (text: string) => void;
  onCameraCapture?: (file: File, preview: string) => void;
  onImageClick?: () => void;
  onVideoClick?: () => void;
  onLinkClick?: () => void;
  className?: string;
}

// Simplified formatting options for mobile
const formatOptions = [
  { id: 'bold', icon: 'B', label: 'عريض', action: 'toggleBold' },
  { id: 'italic', icon: 'I', label: 'مائل', action: 'toggleItalic' },
  { id: 'h2', icon: 'H2', label: 'عنوان', action: 'toggleHeading', attrs: { level: 2 } },
  { id: 'list', icon: '•', label: 'قائمة', action: 'toggleBulletList' },
  { id: 'number', icon: '1.', label: 'مرقمة', action: 'toggleOrderedList' },
];

export function MobileEditorToolbar({
  editor,
  onVoiceInput,
  onCameraCapture,
  onImageClick,
  onVideoClick,
  onLinkClick,
  className = '',
}: MobileEditorToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const haptic = useHaptic();

  if (!editor) return null;

  const handleFormatAction = (action: string, attrs?: Record<string, unknown>) => {
    haptic.light();

    switch (action) {
      case 'toggleBold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'toggleItalic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'toggleHeading':
        editor.chain().focus().toggleHeading(attrs as { level: 1 | 2 | 3 | 4 | 5 | 6 }).run();
        break;
      case 'toggleBulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'toggleOrderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
    }
  };

  const isActive = (action: string, attrs?: Record<string, unknown>) => {
    switch (action) {
      case 'toggleBold':
        return editor.isActive('bold');
      case 'toggleItalic':
        return editor.isActive('italic');
      case 'toggleHeading':
        return editor.isActive('heading', attrs);
      case 'toggleBulletList':
        return editor.isActive('bulletList');
      case 'toggleOrderedList':
        return editor.isActive('orderedList');
      default:
        return false;
    }
  };

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb',
      className
    )}
    style={{
      paddingBottom: 'env(safe-area-inset-bottom, 16px)',
    }}
    >
      {/* Primary toolbar */}
      <div className="flex items-center justify-around px-2 py-2">
        {/* Formatting toggle */}
        <button
          onClick={() => {
            setExpanded(!expanded);
            haptic.medium();
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          aria-label="تنسيق"
        >
          <svg
            className={`w-6 h-6 transition-transform ${expanded ? 'rotate-45' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>

        {/* Voice input */}
        {onVoiceInput && (
          <div className="min-h-[44px]">
            <VoiceInputButton
              onTranscript={onVoiceInput}
              variant="ghost"
              className="min-h-[44px] px-3"
            />
          </div>
        )}

        {/* Camera capture */}
        {onCameraCapture && (
          <div className="min-h-[44px]">
            <CameraUploadButton
              onCapture={onCameraCapture}
              variant="ghost"
              className="min-h-[44px] px-3"
            />
          </div>
        )}

        {/* Image picker */}
        {onImageClick && (
          <button
            onClick={() => {
              onImageClick();
              haptic.light();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="إدراج صورة"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}

        {/* Video */}
        {onVideoClick && (
          <button
            onClick={() => {
              onVideoClick();
              haptic.light();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="إدراج فيديو"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        {/* Link */}
        {onLinkClick && (
          <button
            onClick={() => {
              onLinkClick();
              haptic.light();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="إدراج رابط"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded formatting options */}
      {expanded && (
        <div className="border-t border-border bg-muted/30">
          <div className="flex items-center justify-around px-2 py-3 overflow-x-auto">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleFormatAction(option.action, option.attrs)}
                className={cn(
                  'min-h-[48px] min-w-[48px] flex flex-col items-center justify-center rounded-lg transition-all',
                  isActive(option.action, option.attrs)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
                aria-label={option.label}
              >
                <span className="text-lg font-bold">{option.icon}</span>
                <span className="text-[10px] mt-0.5">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileEditorToolbar;
