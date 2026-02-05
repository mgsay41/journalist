'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from '@/components/ui/Alert';

interface Shortcut {
  key: string;
  display: string;
  description: string;
  category: 'editor' | 'navigation' | 'actions' | 'ai';
}

interface KeyboardShortcutsProps {
  onShortcutTriggered?: (shortcut: string) => void;
  className?: string;
  showHint?: boolean;
}

const shortcuts: Shortcut[] = [
  // Editor shortcuts
  { key: 'bold', display: 'Ctrl + B', description: 'نص عريض', category: 'editor' },
  { key: 'italic', display: 'Ctrl + I', description: 'نص مائل', category: 'editor' },
  { key: 'underline', display: 'Ctrl + U', description: 'تسطير النص', category: 'editor' },
  { key: 'strike', display: 'Ctrl + Shift + X', description: 'شطب النص', category: 'editor' },
  { key: 'heading', display: 'Ctrl + Alt + 1-6', description: 'عنوان (1-6)', category: 'editor' },
  { key: 'list-ul', display: 'Ctrl + Shift + 8', description: 'قائمة نقطية', category: 'editor' },
  { key: 'list-ol', display: 'Ctrl + Shift + 7', description: 'قائمة رقمية', category: 'editor' },
  { key: 'quote', display: 'Ctrl + Shift + 9', description: 'اقتباس', category: 'editor' },
  { key: 'code', display: 'Ctrl + E', description: 'كود', category: 'editor' },
  { key: 'link', display: 'Ctrl + K', description: 'إدراج رابط', category: 'editor' },

  // Navigation shortcuts
  { key: 'save', display: 'Ctrl + S', description: 'حفظ المسودة', category: 'navigation' },
  { key: 'publish', display: 'Ctrl + Enter', description: 'نشر المقال', category: 'navigation' },
  { key: 'preview', display: 'Ctrl + P', description: 'معاينة', category: 'navigation' },
  { key: 'esc', display: 'Esc', description: 'إغلاق/خروج', category: 'navigation' },

  // AI shortcuts
  { key: 'ai-assist', display: 'Ctrl + Space', description: 'مساعد الكتابة', category: 'ai' },
  { key: 'ai-improve', display: 'Ctrl + Shift + I', description: 'تحسين النص', category: 'ai' },
  { key: 'ai-complete', display: 'Ctrl + Shift + C', description: 'إكمال النص', category: 'ai' },

  // Action shortcuts
  { key: 'undo', display: 'Ctrl + Z', description: 'تراجع', category: 'actions' },
  { key: 'redo', display: 'Ctrl + Shift + Z', description: 'إعادة', category: 'actions' },
  { key: 'find', display: 'Ctrl + F', description: 'بحث', category: 'actions' },
  { key: 'replace', display: 'Ctrl + H', description: 'استبدال', category: 'actions' },
  { key: 'fullscreen', display: 'F11', description: 'ملء الشاشة', category: 'actions' },
];

const categoryLabels: Record<string, string> = {
  'editor': 'المحرر',
  'navigation': 'التنقل',
  'actions': 'الإجراءات',
  'ai': 'الذكاء الاصطناعي',
};

const categoryColors: Record<string, string> = {
  'editor': 'bg-blue-500/10 text-blue-600',
  'navigation': 'bg-green-500/10 text-green-600',
  'actions': 'bg-purple-500/10 text-purple-600',
  'ai': 'bg-orange-500/10 text-orange-600',
};

export function KeyboardShortcuts({
  onShortcutTriggered,
  className = '',
  showHint = true,
}: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.contentEditable === 'true';

      // Open shortcuts modal with ?
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Close modal with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Handle shortcuts only when modal is closed
      if (!isOpen) {
        // Ctrl + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          onShortcutTriggered?.('save');
        }

        // Ctrl + Enter: Publish
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onShortcutTriggered?.('publish');
        }

        // Ctrl + K: Link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          onShortcutTriggered?.('link');
        }

        // Ctrl + B: Bold (only if not in input)
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isInput) {
          e.preventDefault();
          onShortcutTriggered?.('bold');
        }

        // Ctrl + I: Italic (only if not in input)
        if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !isInput) {
          e.preventDefault();
          onShortcutTriggered?.('italic');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onShortcutTriggered]);

  // Close modal when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter shortcuts by category and search query
  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesCategory = activeCategory === 'all' || shortcut.category === activeCategory;
    const matchesSearch = shortcut.description.includes(searchQuery) ||
                         shortcut.display.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce<Record<string, Shortcut[]>>((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {});

  return (
    <>
      {/* Hint button */}
      {showHint && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-colors ${className}`}
          title="اختصارات لوحة المفاتيح (؟)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="sr-only">اختصارات لوحة المفاتيح</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">اختصارات لوحة المفاتيح</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="إغلاق"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن اختصار..."
                  className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-6 pt-4 border-b border-border">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeCategory === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  الكل ({shortcuts.length})
                </button>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label} ({groupedShortcuts[key]?.length || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Shortcuts list */}
            <div className="flex-1 overflow-y-auto p-6">
              {searchQuery && filteredShortcuts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">لا توجد نتائج للبحث</p>
                </div>
              ) : activeCategory === 'all' || searchQuery ? (
                // Show all shortcuts with category headers
                <div className="space-y-6">
                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
                    const filtered = searchQuery
                      ? categoryShortcuts.filter(s =>
                          s.description.includes(searchQuery) || s.display.includes(searchQuery)
                        )
                      : categoryShortcuts;

                    if (filtered.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[category]}`}>
                            {categoryLabels[category]}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {filtered.map((shortcut) => (
                            <div
                              key={shortcut.key}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{shortcut.description}</p>
                              </div>
                              <kbd className="px-3 py-1.5 bg-background border border-border rounded-md text-sm text-muted-foreground font-mono">
                                {shortcut.display}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show shortcuts for selected category
                <div className="space-y-2">
                  {filteredShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{shortcut.description}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${categoryColors[shortcut.category]}`}>
                          {categoryLabels[shortcut.category]}
                        </span>
                      </div>
                      <kbd className="px-3 py-1.5 bg-background border border-border rounded-md text-sm text-muted-foreground font-mono">
                        {shortcut.display}
                      </kbd>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                اضغط <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">؟</kbd> في أي وقت لفتح هذه القائمة
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default KeyboardShortcuts;

// Hook to use keyboard shortcuts in components
export function useKeyboardShortcuts() {
  const triggerShortcut = useCallback((shortcut: string) => {
    // Emit custom event that components can listen to
    const event = new CustomEvent('keyboard-shortcut', { detail: { shortcut } });
    window.dispatchEvent(event);
  }, []);

  const listenShortcut = useCallback(
    (shortcut: string, callback: () => void) => {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail.shortcut === shortcut) {
          callback();
        }
      };

      window.addEventListener('keyboard-shortcut', handler as EventListener);
      return () => {
        window.removeEventListener('keyboard-shortcut', handler as EventListener);
      };
    },
    []
  );

  return { triggerShortcut, listenShortcut };
}
