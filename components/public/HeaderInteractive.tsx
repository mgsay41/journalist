'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DarkModeToggle } from './DarkModeToggle';

interface HeaderInteractiveProps {
  mainCategories: Array<{ id: string; name: string; slug: string }>;
  siteName?: string;
  siteTagline?: string | null;
}

export function HeaderInteractive({ mainCategories, siteName = 'الموقع الصحفي', siteTagline = 'صحافة مستقلة · صوت حر' }: HeaderInteractiveProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        // Hysteresis: collapse after 80px, re-expand only when back near top (< 5px).
        // The wide gap prevents the header's own height change from flipping the state.
        setScrolled(prev => (prev ? y > 5 : y > 80));
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const closeAll = () => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  return (
    <>
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeAll}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-0 z-50 w-full">
        {/* Main header panel */}
        <div className="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b border-border">
          <div className="container mx-auto px-4">

            {/* Logo + tagline — collapses on scroll */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                scrolled ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-20 opacity-100'
              }`}
            >
              <div className="pt-3 pb-2 md:pt-4 md:pb-3 flex flex-col items-start">
                <Link href="/" className="no-underline group">
                  <span className="font-display text-2xl md:text-3xl font-bold text-foreground group-hover:text-accent transition-colors duration-200 leading-none">
                    {siteName}
                  </span>
                </Link>
                {siteTagline && (
                  <p className="text-xs text-muted-foreground mt-1 tracking-widest select-none hidden sm:block">
                    {siteTagline}
                  </p>
                )}
              </div>
            </div>

            {/* Nav bar */}
            <div className="flex h-11 items-center justify-between gap-2">
              {/* Compact logo — only visible when scrolled */}
              <div
                className={`shrink-0 overflow-hidden transition-all duration-300 ${
                  scrolled ? 'max-w-50 opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                <Link
                  href="/"
                  className="font-display text-xl font-bold text-foreground hover:text-accent transition-colors no-underline whitespace-nowrap"
                >
                  {siteName}
                </Link>
              </div>

              {/* Desktop navigation */}
              <nav className="hidden md:flex items-center gap-0.5 flex-1">
                <Link
                  href="/"
                  className="px-3 py-1 text-sm font-medium text-foreground hover:text-accent hover:bg-muted transition-colors rounded-full"
                >
                  الرئيسية
                </Link>
                {mainCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-accent hover:bg-muted transition-colors rounded-full"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <DarkModeToggle variant="icon" />

                <button
                  onClick={() => { setSearchOpen(!searchOpen); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                  aria-label="بحث"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                <button
                  onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setSearchOpen(false); }}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Gold rule separator */}
            <div className="h-px bg-linear-to-l from-transparent via-accent to-transparent opacity-40" />

            {/* Search bar — always in DOM, toggled with CSS to avoid layout shift */}
            <div className={`py-3 border-t border-border${searchOpen ? '' : ' hidden'}`}>
              <form action="/search" method="GET" className="flex gap-2">
                <input
                  type="text"
                  name="q"
                  placeholder="ابحث عن مقالات..."
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  بحث
                </button>
              </form>
            </div>

            {/* Mobile menu — always in DOM, toggled with CSS to avoid layout shift */}
            <div className={`md:hidden border-t border-border${mobileMenuOpen ? '' : ' hidden'}`}>
              <nav className="flex flex-col py-2">
                <Link
                  href="/"
                  className="flex items-center px-3 py-3 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors min-h-11"
                  onClick={closeAll}
                >
                  الرئيسية
                </Link>
                {mainCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="flex items-center px-3 py-3 text-sm font-medium text-muted-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors min-h-11"
                    onClick={closeAll}
                  >
                    {category.name}
                  </Link>
                ))}
                <Link
                  href="/search"
                  className="flex items-center px-3 py-3 text-sm font-medium text-muted-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors min-h-11"
                  onClick={closeAll}
                >
                  بحث
                </Link>
              </nav>
            </div>

          </div>
        </div>
      </header>
    </>
  );
}
