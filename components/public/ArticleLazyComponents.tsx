'use client';

/**
 * Client-side lazy-loaded wrappers for below-the-fold article UI components.
 * next/dynamic with ssr:false must live in a Client Component when using Turbopack.
 * The server component (article/[slug]/page.tsx) imports from here.
 */

import dynamic from 'next/dynamic';

export const TableOfContentsSticky = dynamic(
  () => import('./TableOfContents').then((m) => ({ default: m.TableOfContentsSticky })),
  { ssr: false, loading: () => null }
);

export const ReadingSettings = dynamic(
  () => import('./FontSizeControls').then((m) => ({ default: m.ReadingSettings })),
  { ssr: false, loading: () => null }
);

export const TextToSpeech = dynamic(
  () => import('./TextToSpeech').then((m) => ({ default: m.TextToSpeech })),
  { ssr: false, loading: () => null }
);
