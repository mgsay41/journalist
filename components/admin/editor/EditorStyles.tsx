/**
 * Editor Styles Component
 *
 * Exports TipTap editor CSS styles as a string and a style tag.
 * Phase 2 Frontend Audit - Split from RichTextEditor for better maintainability
 */

export const editorStyles = `
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
    padding-inline-start: 1.5em;
  }

  /* Blockquote styles */
  .ProseMirror blockquote {
    border-inline-start: 3px solid currentColor;
    padding-inline-start: 1rem;
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

  /* Grammar Error Styles */
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

  .grammar-error-spelling {
    text-decoration-color: #ef4444;
  }

  .grammar-error-grammar {
    text-decoration-color: #f97316;
  }

  .grammar-error-punctuation {
    text-decoration-color: #eab308;
  }

  .grammar-error-style {
    text-decoration-color: #3b82f6;
  }

  /* SEO Suggestion Styles */
  .seo-suggestion {
    cursor: pointer;
    position: relative;
    border-radius: 2px;
    transition: background-color 0.15s ease;
  }

  .seo-suggestion:hover {
    background-color: rgba(34, 197, 94, 0.2);
  }

  .seo-suggestion-high {
    background-color: rgba(34, 197, 94, 0.15);
    border-bottom: 2px solid #22c55e;
  }

  .seo-suggestion-high:hover {
    background-color: rgba(34, 197, 94, 0.25);
  }

  .seo-suggestion-medium {
    background-color: rgba(34, 197, 94, 0.1);
    border-bottom: 1px dashed #22c55e;
  }

  .seo-suggestion-medium:hover {
    background-color: rgba(34, 197, 94, 0.2);
  }

  .seo-suggestion-low {
    background-color: rgba(34, 197, 94, 0.05);
    border-bottom: 1px dotted #22c55e;
  }

  .seo-suggestion-low:hover {
    background-color: rgba(34, 197, 94, 0.15);
  }

  /* AI Edit Styles */
  .ai-edit {
    cursor: pointer;
    position: relative;
    background-color: rgba(245, 158, 11, 0.15);
    border-bottom: 2px solid #f59e0b;
    transition: background-color 0.15s ease;
  }

  .ai-edit:hover {
    background-color: rgba(245, 158, 11, 0.25);
  }
`;

/**
 * Editor Styles Component
 *
 * Injects TipTap editor styles via a style tag.
 */
export function EditorStyles() {
  return <style>{editorStyles}</style>;
}
