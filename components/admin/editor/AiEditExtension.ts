'use client';

import { Mark, mergeAttributes } from '@tiptap/core';

export interface AiEditOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface AiEditAttributes {
  id: string;
  originalText: string;
  aiText: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiEdit: {
      setAiEdit: (attributes: AiEditAttributes) => ReturnType;
      toggleAiEdit: (attributes: AiEditAttributes) => ReturnType;
      unsetAiEdit: () => ReturnType;
      removeAiEdit: (id: string) => ReturnType;
      acceptAiEdit: (id: string) => ReturnType;
      rejectAiEdit: (id: string) => ReturnType;
      acceptAllAiEdits: () => ReturnType;
      rejectAllAiEdits: () => ReturnType;
      clearAllAiEdits: () => ReturnType;
    };
  }
}

export const AiEditExtension = Mark.create<AiEditOptions>({
  name: 'aiEdit',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-ai-edit-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { 'data-ai-edit-id': attributes.id };
        },
      },
      originalText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-original-text'),
        renderHTML: (attributes) => {
          if (!attributes.originalText) return {};
          const truncated = attributes.originalText.length > 200 
            ? attributes.originalText.substring(0, 200) + '...' 
            : attributes.originalText;
          return { 'data-original-text': truncated };
        },
      },
      aiText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-ai-text'),
        renderHTML: (attributes) => {
          if (!attributes.aiText) return {};
          return { 'data-ai-text': attributes.aiText };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ai-edit]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-ai-edit': '',
        class: 'ai-edit',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAiEdit:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleAiEdit:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetAiEdit:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      removeAiEdit:
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
      acceptAiEdit:
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
      rejectAiEdit:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;
          let originalText = '';

          doc.descendants((node, pos) => {
            if (node.isText && !found) {
              const marks = node.marks.filter(
                (mark) => mark.type.name === this.name && mark.attrs.id === id
              );
              if (marks.length > 0) {
                found = true;
                originalText = marks[0].attrs.originalText as string;
                if (dispatch) {
                  const end = pos + node.nodeSize;
                  tr.replaceWith(pos, end, state.schema.text(originalText));
                }
              }
            }
          });

          return found;
        },
      acceptAllAiEdits:
        () =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const markType = state.schema.marks[this.name];

          if (dispatch && markType) {
            tr.removeMark(0, doc.content.size, markType);
          }

          return true;
        },
      rejectAllAiEdits:
        () =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const markType = state.schema.marks[this.name];
          
          type EditInfo = { pos: number; nodeSize: number; originalText: string };
          const edits: EditInfo[] = [];

          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks.filter(
                (mark) => mark.type.name === this.name
              );
              if (marks.length > 0) {
                edits.push({
                  pos,
                  nodeSize: node.nodeSize,
                  originalText: marks[0].attrs.originalText as string,
                });
              }
            }
          });

          if (dispatch) {
            edits.sort((a, b) => b.pos - a.pos);
            
            edits.forEach((edit) => {
              const end = edit.pos + edit.nodeSize;
              tr.replaceWith(edit.pos, end, state.schema.text(edit.originalText));
            });

            if (markType) {
              tr.removeMark(0, doc.content.size, markType);
            }
          }

          return edits.length > 0;
        },
      clearAllAiEdits:
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

export const aiEditStyles = `
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

export default AiEditExtension;
