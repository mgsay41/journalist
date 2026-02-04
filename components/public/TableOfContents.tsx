'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Heading {
  id: string;
  text: string;
  level: number;
  children?: Heading[];
}

interface TableOfContentsProps {
  contentId?: string;
  title?: string;
  maxDepth?: number;
  className?: string;
}

export function TableOfContents({
  contentId = 'article-content',
  title = 'محتويات المقال',
  maxDepth = 3,
  className = '',
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observer = useRef<IntersectionObserver | null>(null);

  // Extract headings from content
  useEffect(() => {
    const element = document.getElementById(contentId);
    if (!element) return;

    const headingElements = element.querySelectorAll('h2, h3, h4');
    const extractedHeadings: Heading[] = [];

    headingElements.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1));
      if (level > maxDepth) return;

      const id = heading.id || `heading-${extractedHeadings.length}`;
      if (!heading.id) {
        heading.id = id;
      }

      extractedHeadings.push({
        id,
        text: heading.textContent || '',
        level,
      });
    });

    setHeadings(extractedHeadings);
  }, [contentId, maxDepth]);

  // Set up intersection observer for active heading
  useEffect(() => {
    if (headings.length === 0) return;

    const element = document.getElementById(contentId);
    if (!element) return;

    // Clean up previous observer
    if (observer.current) {
      observer.current.disconnect();
    }

    // Create new observer
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px', // Trigger when heading is near top
        threshold: 0,
      }
    );

    // Observe all headings
    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) {
        observer.current?.observe(el);
      }
    });

    return () => {
      observer.current?.disconnect();
    };
  }, [headings, contentId]);

  if (headings.length === 0) {
    return null;
  }

  // Organize headings into hierarchy
  const rootHeadings: Heading[] = [];
  const stack: Heading[] = [];

  headings.forEach((heading) => {
    const node = { ...heading, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootHeadings.push(node);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    }

    stack.push(node);
  });

  return (
    <nav className={`table-of-contents ${className}`} aria-label="جدول المحتويات">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2 text-sm">
        {rootHeadings.map((heading) => (
          <TOCItem
            key={heading.id}
            heading={heading}
            activeId={activeId}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
}

interface TOCItemProps {
  heading: Heading;
  activeId: string;
  depth: number;
}

function TOCItem({ heading, activeId, depth }: TOCItemProps) {
  const isActive = activeId === heading.id;
  const hasChildren = heading.children && heading.children.length > 0;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(heading.id);
    if (element) {
      const offset = 100; // Account for fixed headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <li className={depth > 0 ? 'mr-4' : ''}>
      <a
        href={`#${heading.id}`}
        onClick={handleClick}
        className={`
          block py-1 transition-colors duration-200
          ${isActive
            ? 'text-primary font-medium border-r-2 border-primary pr-2'
            : 'text-muted-foreground hover:text-foreground'
          }
          ${heading.level === 3 ? 'text-xs' : ''}
        `}
        style={{
          marginRight: depth > 0 ? `${depth * 8}px` : 0,
        }}
      >
        {heading.text}
      </a>
      {hasChildren && (
        <ul className="mt-1 space-y-1">
          {heading.children!.map((child) => (
            <TOCItem
              key={child.id}
              heading={child}
              activeId={activeId}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Minimal sticky version for sidebar
export function TableOfContentsSticky(props: Omit<TableOfContentsProps, 'className'>) {
  return (
    <div className="sticky top-20">
      <TableOfContents {...props} className="border border-border-subtle rounded-lg p-4 bg-card" />
    </div>
  );
}
