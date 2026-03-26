'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const NEWSLETTER_KEY = 'newsletter_subscribed';

interface PublicFooterProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: Array<{ id: string; name: string; slug: string }>;
  siteName?: string;
}

export function PublicFooter({ categories = [], popularTags = [], siteName = 'الموقع الصحفي' }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const mainCategories = categories.filter(c => !c.slug.includes('/')).slice(0, 6);

  return (
    <footer className="bg-[#1A1814] text-[#F5F0E8]">
      <FooterNewsletterSection />

      {/* Main grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Logo + bio + social */}
          <div>
            <Link href="/" className="no-underline block mb-3">
              <span className="font-display text-xl font-bold text-[#F5F0E8]">
                {siteName}
              </span>
            </Link>
            <p className="text-sm text-[#9A9590] leading-relaxed mb-5">
              منصة عربية متكاملة للمحتوى الصحفي، توفر مقالات عالية الجودة في مختلف المجالات.
            </p>
            <div className="flex gap-2">
              <FooterSocialLink
                href="#"
                aria-label="تويتر"
                icon="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"
              />
              <FooterSocialLink
                href="#"
                aria-label="فيسبوك"
                icon="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"
              />
              <FooterSocialLink
                href="/feed.xml"
                aria-label="RSS"
                icon="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16M5 19a1 1 0 100-2 1 1 0 000 2z"
              />
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">
              الأقسام
            </h4>
            <ul className="space-y-2.5">
              {mainCategories.length > 0 ? (
                mainCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="text-sm text-[#9A9590] hover:text-accent transition-colors no-underline"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                ['الرئيسية', 'عن الموقع', 'اتصل بنا'].map((l) => (
                  <li key={l}>
                    <span className="text-sm text-[#6B6560]">{l}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Popular tags */}
          <div>
            <h4 className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">
              الوسوم الشائعة
            </h4>
            {popularTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 9).map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="text-xs px-2.5 py-1 rounded-full border border-[#3A3530] text-[#9A9590] hover:text-accent hover:border-accent transition-colors no-underline"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B6560]">لا توجد وسوم بعد</p>
            )}
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#2A2720]">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-xs text-[#6B6560]">
              © {currentYear} {siteName}. جميع الحقوق محفوظة.
            </p>
            <div className="flex gap-5">
              {[
                { href: '/about', label: 'عن الموقع' },
                { href: '/contact', label: 'اتصل بنا' },
                { href: '/privacy', label: 'سياسة الخصوصية' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs text-[#6B6560] hover:text-accent transition-colors no-underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterSocialLink({
  href,
  icon,
  'aria-label': label,
}: {
  href: string;
  icon: string;
  'aria-label': string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-9 h-9 rounded-full bg-[#2A2720] text-[#9A9590] hover:text-accent hover:bg-[#3A3530] flex items-center justify-center transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
    </a>
  );
}

function FooterNewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isSubscribed = localStorage.getItem(NEWSLETTER_KEY) === 'true';
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setSubscribed(true);
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!ready || subscribed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'تم الاشتراك بنجاح!');
        setEmail('');
        localStorage.setItem(NEWSLETTER_KEY, 'true');
      } else {
        setStatus('error');
        setMessage(data.error || 'حدث خطأ. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setStatus('error');
      setMessage('حدث خطأ في الاتصال.');
    }
  };

  return (
    <div className="border-b border-[#2A2720]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">
            النشرة البريدية
          </p>
          <h3 className="font-display text-2xl md:text-3xl font-bold text-[#F5F0E8] mb-2">
            اشترك في النشرة الأسبوعية
          </h3>
          <p className="text-sm text-[#9A9590] mb-6 leading-relaxed">
            أفضل المقالات والتحليلات مباشرة إلى بريدك كل أسبوع.
          </p>

          {status === 'success' ? (
            <p className="text-sm text-accent font-medium py-2">✓ {message}</p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="بريدك الإلكتروني"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-[#2A2720] border border-[#3A3530] text-[#F5F0E8] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {status === 'loading' ? '...' : 'اشتراك'}
                </button>
              </form>
              {status === 'error' && (
                <p className="text-xs text-red-400 mt-2">{message}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
