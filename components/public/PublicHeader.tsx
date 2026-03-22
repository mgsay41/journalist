'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DarkModeToggle } from './DarkModeToggle';

interface PublicHeaderProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
}

export function PublicHeader({ categories = [] }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const mainCategories = categories.filter(c => !c.slug.includes('/')).slice(0, 5);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const today = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top ticker bar — collapses on scroll */}
      <div
        className={`bg-foreground text-primary-foreground overflow-hidden transition-all duration-300 ease-in-out ${
          scrolled ? 'max-h-0' : 'max-h-10'
        }`}
      >
        <div className="container mx-auto px-4 h-9 flex items-center justify-between">
          <span className="text-xs opacity-70 select-none">{today}</span>
          <span className="text-xs opacity-50 hidden sm:block tracking-widest">
            صحافة مستقلة · صوت حر
          </span>
        </div>
      </div>

      {/* Main header panel */}
      <div className="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-b border-border">
        <div className="container mx-auto px-4">

          {/* Logo + tagline — collapses on scroll */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              scrolled ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-24 opacity-100'
            }`}
          >
            <div className="pt-4 pb-3 flex flex-col items-start">
              <Link href="/" className="no-underline group">
                <span className="font-display text-3xl font-bold text-foreground group-hover:text-accent transition-colors duration-200 leading-none">
                  الموقع الصحفي
                </span>
              </Link>
              <p className="text-xs text-muted-foreground mt-1 tracking-widest select-none">
                صحافة مستقلة · صوت حر
              </p>
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
                الموقع الصحفي
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
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                aria-label="بحث"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="القائمة"
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

          {/* Search bar */}
          {searchOpen && (
            <div className="py-3 border-t border-border">
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
                  className="px-5 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  بحث
                </button>
              </form>
            </div>
          )}

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-border">
              <nav className="flex flex-col gap-0.5">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  الرئيسية
                </Link>
                {mainCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
                <Link
                  href="/search"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  بحث
                </Link>
              </nav>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
