import type { Metadata } from "next";
import { Cairo, Amiri } from "next/font/google";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { Providers } from "@/components/Providers";
import { WebVitals } from "@/components/public/WebVitals";
import { GooeyToasterClient } from "@/components/ui/GooeyToasterClient";
import "./globals.css";
import "goey-toast/styles.css";
// Validate required environment variables at startup
import "@/lib/env";

// Cairo — body text and UI, excellent for Arabic
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

// Amiri — classical Arabic serif for display headlines
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "نظام إدارة المحتوى للصحفيين",
    template: "%s | نظام إدارة المحتوى",
  },
  description: "نظام إدارة محتوى عربي متكامل للصحفيين ومبدعي المحتوى",
  keywords: ["نظام إدارة المحتوى", "صحافة", "محتوى عربي", "مدونة"],
  authors: [{ name: "المسؤول" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "الموقع الصحفي",
  },
  openGraph: {
    title: "نظام إدارة المحتوى للصحفيين",
    description: "نظام إدارة محتوى عربي متكامل للصحفيين ومبدعي المحتوى",
    locale: "ar_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "نظام إدارة المحتوى للصحفيين",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="alternate" type="application/rss+xml" title="الموقع الصحفي - RSS" href="/feed.xml" />
        <meta name="theme-color" content="#C8892A" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Prevent flash of wrong theme (FOUC) by applying class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cms-theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}else if(t==='light'){d.classList.add('light')}else{if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}else{d.classList.add('light')}}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {/* Phase 3 - Web Vitals monitoring */}
        <WebVitals debug={process.env.NODE_ENV === 'development'} />
        <Providers>
          <RootErrorBoundary>{children}</RootErrorBoundary>
        </Providers>
        <GooeyToasterClient />
      </body>
    </html>
  );
}
