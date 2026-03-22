'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/Button';

interface EditorStatsProps {
  editor: Editor;
  editable?: boolean;
}

/**
 * Editor Stats Component
 *
 * Displays word count, character count, and reading time.
 * Phase 2 Frontend Audit - Split from RichTextEditor for better maintainability
 */
export function EditorStats({ editor, editable = true }: EditorStatsProps) {
  const wordCount = editor.storage.characterCount.words();
  const characterCount = editor.storage.characterCount.characters();

  return (
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
  );
}
