'use client';

import { useState, useMemo } from 'react';

interface SocialShareProps {
  title: string;
  url: string;
  description?: string;
  variant?: 'sidebar' | 'inline';
}

export function SocialShare({ title, url, description, variant = 'inline' }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  // Lazy initializer: runs once on mount (client only), never on server
  // This avoids depending on NEXT_PUBLIC_APP_URL being set
  const [origin] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')
  );

  const { fullUrl, shareLinks } = useMemo(() => {
    const base = origin || process.env.NEXT_PUBLIC_APP_URL || '';
    const resolved = url.startsWith('http') ? url : `${base}${url}`;

    const encodedUrl = encodeURIComponent(resolved);
    const encodedTitle = encodeURIComponent(title);

    // Rich share text for messaging apps
    const lines: string[] = [`📰 ${title}`];
    if (description?.trim()) lines.push(`\n${description.trim()}`);
    lines.push(`\n\nاقرأ المقال كاملاً 👇\n${resolved}`);
    const richText = lines.join('');

    // Telegram: title + description as text, URL passed separately
    const telegramLines: string[] = [`📰 ${title}`];
    if (description?.trim()) telegramLines.push(`\n${description.trim()}`);

    return {
      fullUrl: resolved,
      shareLinks: {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(richText)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(telegramLines.join(''))}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
    };
  }, [url, origin, title, description]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /* ── Sidebar variant — vertical icon card ── */
  if (variant === 'sidebar') {
    return (
      <div
        className="border border-border bg-card"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Header strip */}
        <div
          className="px-4 py-3 border-b border-border flex items-center gap-2"
          style={{ background: 'var(--muted)' }}
        >
          <div className="w-1 h-4 bg-accent shrink-0" />
          <span className="text-xs font-bold text-foreground uppercase" style={{ letterSpacing: '0.08em' }}>
            مشاركة
          </span>
        </div>

        {/* Icon buttons */}
        <div className="py-1">
          <SidebarShareLink
            href={shareLinks.whatsapp}
            label="واتساب"
            color="#25D366"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            }
          />

          <SidebarShareLink
            href={shareLinks.twitter}
            label="تويتر"
            color="#000000"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            }
          />

          <SidebarShareLink
            href={shareLinks.facebook}
            label="فيسبوك"
            color="#1877F2"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
          />

          <SidebarShareLink
            href={shareLinks.telegram}
            label="تيليجرام"
            color="#229ED9"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            }
          />

          {/* Divider */}
          <div className="mx-3 my-1 h-px bg-border" />

          {/* Copy Link */}
          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200"
            style={{
              background: copied ? 'var(--accent-light)' : 'transparent',
              color: copied ? 'var(--accent)' : 'var(--muted-foreground)',
              borderInlineStart: copied ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            onMouseEnter={e => {
              if (!copied) {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'var(--muted)';
                el.style.color = 'var(--foreground)';
              }
            }}
            onMouseLeave={e => {
              if (!copied) {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--muted-foreground)';
              }
            }}
            aria-label="نسخ الرابط"
          >
            {copied ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
            <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
          </button>
        </div>
      </div>
    );
  }

  /* ── Inline variant — full-width tappable rows (mobile-first) ── */
  const inlineRows = [
    {
      href: shareLinks.whatsapp,
      label: 'واتساب',
      color: '#25D366',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      href: shareLinks.twitter,
      label: 'X / تويتر',
      color: '#1A1814',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      href: shareLinks.facebook,
      label: 'فيسبوك',
      color: '#1877F2',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      href: shareLinks.telegram,
      label: 'تيليجرام',
      color: '#229ED9',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {inlineRows.map(({ href, label, color, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted transition-colors group"
          aria-label={`مشاركة على ${label}`}
        >
          <span
            className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full transition-transform duration-200 group-hover:scale-110"
            style={{ background: `${color}18`, color }}
          >
            {icon}
          </span>
          <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
          {/* Chevron — points left (forward direction in RTL) */}
          <svg
            className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-70 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
      ))}

      {/* Copy link row */}
      <button
        onClick={copyToClipboard}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors group"
        aria-label="نسخ الرابط"
      >
        <span
          className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full transition-all duration-200"
          style={{
            background: copied ? 'var(--accent-light)' : 'var(--muted)',
            color: copied ? 'var(--accent)' : 'var(--muted-foreground)',
          }}
        >
          {copied ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </span>
        <span
          className="flex-1 text-sm font-medium text-right"
          style={{ color: copied ? 'var(--accent)' : 'var(--foreground)' }}
        >
          {copied ? 'تم نسخ الرابط!' : 'نسخ الرابط'}
        </span>
        {!copied && (
          <svg
            className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-70 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ── Helper: sidebar share link ── */
function SidebarShareLink({
  href,
  label,
  icon,
  color,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200"
      style={{
        color: 'var(--muted-foreground)',
        borderInlineStart: '2px solid transparent',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--muted)';
        el.style.color = color;
        el.style.borderInlineStartColor = color;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'transparent';
        el.style.color = 'var(--muted-foreground)';
        el.style.borderInlineStartColor = 'transparent';
      }}
      aria-label={`مشاركة على ${label}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
