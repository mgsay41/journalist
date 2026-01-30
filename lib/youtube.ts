/**
 * YouTube utility functions
 * Handles URL parsing, video ID extraction, and thumbnail fetching
 */

// YouTube URL patterns
const YOUTUBE_URL_PATTERNS = [
  // Standard watch URLs
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  // Short URLs
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // Embed URLs
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Privacy-enhanced embed URLs
  /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Shorts URLs
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Mobile URLs
  /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Clean up the URL
  const cleanUrl = url.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check if it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Get YouTube thumbnail URLs for different sizes
 */
export function getYouTubeThumbnails(videoId: string) {
  return {
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`, // 120x90
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, // 320x180
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, // 480x360
    standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`, // 640x480
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 1280x720
  };
}

/**
 * Get the best quality thumbnail for a video
 * Defaults to high quality (480x360)
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  return getYouTubeThumbnails(videoId)[quality];
}

/**
 * Build YouTube embed URL with options
 */
export interface YouTubeEmbedOptions {
  privacyMode?: boolean; // Use youtube-nocookie.com
  autoplay?: boolean;
  startTime?: number; // Start time in seconds
  showRelated?: boolean; // Show related videos at end
  showControls?: boolean;
  loop?: boolean;
  mute?: boolean;
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: YouTubeEmbedOptions = {}
): string {
  const {
    privacyMode = false,
    autoplay = false,
    startTime = 0,
    showRelated = false,
    showControls = true,
    loop = false,
    mute = false,
  } = options;

  const domain = privacyMode ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  const params = new URLSearchParams();

  if (autoplay) params.set('autoplay', '1');
  if (startTime > 0) params.set('start', String(startTime));
  if (!showRelated) params.set('rel', '0');
  if (!showControls) params.set('controls', '0');
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Required for loop to work
  }
  if (mute) params.set('mute', '1');

  const queryString = params.toString();
  return `https://${domain}/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Build a standard YouTube watch URL
 */
export function buildYouTubeWatchUrl(videoId: string, startTime?: number): string {
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  if (startTime && startTime > 0) {
    url += `&t=${startTime}s`;
  }
  return url;
}

/**
 * Parse start time from YouTube URL
 * Supports both t=123 (seconds) and t=1h2m3s formats
 */
export function parseYouTubeStartTime(url: string): number {
  // Match t=123 or t=123s format (seconds)
  const secondsMatch = url.match(/[?&]t=(\d+)s?/);
  if (secondsMatch) {
    return parseInt(secondsMatch[1], 10);
  }

  // Match t=1h2m3s format
  const timeMatch = url.match(/[?&]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] || '0', 10);
    const minutes = parseInt(timeMatch[2] || '0', 10);
    const seconds = parseInt(timeMatch[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Match start=123 format
  const startMatch = url.match(/[?&]start=(\d+)/);
  if (startMatch) {
    return parseInt(startMatch[1], 10);
  }

  return 0;
}

/**
 * Format seconds to human-readable time string (e.g., "1:23" or "1:23:45")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string (e.g., "1:23" or "1:23:45") to seconds
 */
export function parseDuration(timeString: string): number {
  const parts = timeString.split(':').map(p => parseInt(p, 10));

  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return 0;
}

/**
 * Generate iframe HTML for embedding
 */
export function generateYouTubeIframe(
  videoId: string,
  options: YouTubeEmbedOptions & { width?: number | string; height?: number | string; title?: string } = {}
): string {
  const { width = '100%', height = 'auto', title = 'YouTube video player', ...embedOptions } = options;
  const embedUrl = buildYouTubeEmbedUrl(videoId, embedOptions);

  // Calculate aspect ratio style
  const aspectRatioStyle = height === 'auto'
    ? 'aspect-ratio: 16/9;'
    : '';

  const widthAttr = typeof width === 'number' ? `width="${width}"` : `style="width: ${width}; ${aspectRatioStyle}"`;
  const heightAttr = height === 'auto' ? '' : `height="${height}"`;

  return `<iframe
    ${widthAttr}
    ${heightAttr}
    src="${embedUrl}"
    title="${title}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    loading="lazy"
  ></iframe>`.replace(/\s+/g, ' ').trim();
}

/**
 * Video data interface matching the Prisma Video model
 */
export interface VideoData {
  id?: string;
  youtubeUrl: string;
  youtubeId: string;
  title?: string | null;
  thumbnail: string;
  privacyMode: boolean;
  autoplay: boolean;
  startTime: number;
  position: number;
  articleId?: string;
}

/**
 * Create video data from a YouTube URL
 */
export function createVideoDataFromUrl(
  url: string,
  options: Partial<Omit<VideoData, 'youtubeUrl' | 'youtubeId' | 'thumbnail'>> = {}
): VideoData | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const startTime = options.startTime ?? parseYouTubeStartTime(url);

  return {
    youtubeUrl: url,
    youtubeId: videoId,
    title: options.title ?? null,
    thumbnail: getYouTubeThumbnail(videoId, 'high'),
    privacyMode: options.privacyMode ?? false,
    autoplay: options.autoplay ?? false,
    startTime,
    position: options.position ?? 0,
  };
}
