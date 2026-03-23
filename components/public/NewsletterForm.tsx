'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'newsletter_subscribed';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isSubscribed = localStorage.getItem(STORAGE_KEY) === 'true';
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setSubscribed(true);
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

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
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        setStatus('error');
        setMessage(data.error || 'حدث خطأ. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setStatus('error');
      setMessage('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    }
  };

  if (!ready || subscribed) return null;

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-6 md:p-8">
      <h3 className="text-lg font-semibold mb-1">النشرة البريدية</h3>
      <p className="text-sm text-muted-foreground mb-4">
        اشترك لتصلك أحدث المقالات والأخبار مباشرة إلى بريدك الإلكتروني.
      </p>

      {status === 'success' ? (
        <div className="text-sm text-success font-medium py-2">
          ✓ {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="بريدك الإلكتروني"
            required
            disabled={status === 'loading'}
            className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? 'جاري الاشتراك...' : 'اشتراك'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="text-xs text-danger mt-2">{message}</p>
      )}
    </div>
  );
}
