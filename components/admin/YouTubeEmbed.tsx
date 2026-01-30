'use client';

import { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import Image from 'next/image';

// Define the YouTube node attributes interface
interface YouTubeAttributes {
  src: string;
  videoId: string;
  title?: string;
  privacyMode?: boolean;
  startTime?: number;
}

// YouTube embed component that renders in the editor
function YouTubeNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as YouTubeAttributes;
  const { videoId, title, privacyMode, startTime } = attrs;

  const domain = privacyMode
    ? 'www.youtube-nocookie.com'
    : 'www.youtube.com';
  const params = new URLSearchParams();
  if (startTime && startTime > 0) {
    params.set('start', String(startTime));
  }
  params.set('rel', '0'); // Don't show related videos
  const queryString = params.toString();
  const embedUrl = `https://${domain}/embed/${videoId}${queryString ? `?${queryString}` : ''}`;

  return (
    <NodeViewWrapper className="youtube-embed">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted my-4">
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {title && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          {title}
        </p>
      )}
    </NodeViewWrapper>
  );
}

// TipTap extension for YouTube embeds
export const YouTubeExtension = Node.create({
  name: 'youtube',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      videoId: {
        default: null,
      },
      title: {
        default: null,
      },
      privacyMode: {
        default: false,
      },
      startTime: {
        default: 0,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { videoId, title, privacyMode, startTime } = HTMLAttributes;

    const domain = privacyMode
      ? 'www.youtube-nocookie.com'
      : 'www.youtube.com';
    const params = new URLSearchParams();
    if (startTime && startTime > 0) {
      params.set('start', String(startTime));
    }
    params.set('rel', '0');
    const queryString = params.toString();
    const embedUrl = `https://${domain}/embed/${videoId}${queryString ? `?${queryString}` : ''}`;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-youtube-video': '',
        class: 'youtube-embed my-4',
      }),
      [
        'div',
        { class: 'relative w-full aspect-video rounded-lg overflow-hidden bg-muted' },
        [
          'iframe',
          {
            src: embedUrl,
            title: title || 'YouTube video',
            class: 'absolute inset-0 w-full h-full',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowfullscreen: '',
            loading: 'lazy',
            frameborder: '0',
          },
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },
});

// Component for displaying YouTube video in public pages (non-editor)
interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  privacyMode?: boolean;
  startTime?: number;
  autoplay?: boolean;
  className?: string;
}

export function YouTubePlayer({
  videoId,
  title,
  privacyMode = false,
  startTime = 0,
  autoplay = false,
  className = '',
}: YouTubePlayerProps) {
  const domain = privacyMode
    ? 'www.youtube-nocookie.com'
    : 'www.youtube.com';

  const params = new URLSearchParams();
  if (startTime > 0) params.set('start', String(startTime));
  if (autoplay) params.set('autoplay', '1');
  params.set('rel', '0');

  const queryString = params.toString();
  const embedUrl = `https://${domain}/embed/${videoId}${queryString ? `?${queryString}` : ''}`;

  return (
    <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-muted ${className}`}>
      <iframe
        src={embedUrl}
        title={title || 'YouTube video'}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

// Lazy-loading YouTube player with play button overlay
interface LazyYouTubePlayerProps extends YouTubePlayerProps {
  showPlayButton?: boolean;
}

export function LazyYouTubePlayer({
  videoId,
  title,
  privacyMode = false,
  startTime = 0,
  autoplay = false,
  className = '',
  showPlayButton = true,
}: LazyYouTubePlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isLoaded && showPlayButton) {
    return (
      <div
        className={`relative w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group ${className}`}
        onClick={() => setIsLoaded(true)}
      >
        {/* Thumbnail */}
        <Image
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={title || 'YouTube video thumbnail'}
          fill
          className="object-cover"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-600 group-hover:bg-red-700 transition-colors">
            <svg className="w-8 h-8 text-white mr-[-2px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Title */}
        {title && (
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm font-medium line-clamp-2">{title}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <YouTubePlayer
      videoId={videoId}
      title={title}
      privacyMode={privacyMode}
      startTime={startTime}
      autoplay={true} // Auto-play when loaded
      className={className}
    />
  );
}

export default YouTubeExtension;
