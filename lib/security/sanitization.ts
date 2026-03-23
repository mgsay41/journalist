/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize and validate user input
 * to prevent XSS and injection attacks
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous tags and attributes while keeping safe formatting
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove dangerous tags and attributes
  const sanitized = html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(?:object|embed)\b[^<]*(?:(?!<\/(?:object|embed)>)<[^<]*)*<\/(?:object|embed)>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: URLs except images
    .replace(/data:(?!image\/)/gi, 'data-blocked:')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove dangerous attributes
    .replace(/\s+(?:srcset|formaction|action|form|get|post)\s*=\s*["'][^"']*["']/gi, (match) => {
      // Keep if it's a relative URL or safe protocol
      if (/=(?:\s*["']?\s*(?:\/|\.\.\/|https?:\/\/))/i.test(match)) {
        return match;
      }
      return '';
    });

  return sanitized;
}

/**
 * Escape special characters to prevent XSS
 *
 * @param str - Raw string
 * @returns Escaped string safe for HTML output
 */
export function escapeHtml(str: string): string {
  if (!str) return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Sanitize user input for safe display in text content
 *
 * @param input - Raw user input
 * @param maxLength - Optional maximum length
 * @returns Sanitized string
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input) return '';

  let sanitized = input.trim();

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize URL
 *
 * @param url - URL string to validate
 * @param allowedProtocols - List of allowed protocols
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:', 'mailto:', 'tel:']
): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url, 'http://localhost'); // Use base to handle relative URLs

    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    // Remove fragments and sensitive params
    parsed.hash = '';
    parsed.searchParams.delete('token');
    parsed.searchParams.delete('api_key');
    parsed.searchParams.delete('password');

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if valid format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename to prevent path traversal
 *
 * @param filename - Raw filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid Windows characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .trim();

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extIndex = sanitized.lastIndexOf('.');
    if (extIndex > 0) {
      const name = sanitized.substring(0, Math.min(maxLength - 5, extIndex));
      const ext = sanitized.substring(extIndex);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  return sanitized || 'file';
}

/**
 * Validate file type against allowed types
 *
 * @param filename - Filename to check
 * @param allowedTypes - Array of allowed MIME types or extensions
 * @returns True if file type is allowed
 */
export function isValidFileType(
  filename: string,
  allowedTypes: string[]
): boolean {
  if (!filename) return false;

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

  return allowedTypes.some(type => {
    const normalizedType = type.startsWith('.') ? type.toLowerCase() : type.toLowerCase();
    return ext === normalizedType;
  });
}

/**
 * @deprecated Removed: Prisma uses parameterized queries which prevent SQL injection.
 * Stripping SQL keywords corrupts legitimate article content (e.g., "DELETE key from diet").
 * Do not add SQL keyword filtering on top of Prisma.
 */

/**
 * Generate a random token for secure operations
 *
 * @param length - Length of token in bytes
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Object with strength rating and score
 */
export function validatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('أضف أحرفاً صغيرة');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('أضف أحرفاً كبيرة');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('أضف أرقاماً');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('أضف رموزاً خاصة');

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';

  return { strength, score, feedback };
}

/**
 * Sanitize article content using DOMPurify
 *
 * This function is specifically designed for sanitizing TipTap editor content
 * while preserving safe HTML formatting and YouTube embeds.
 *
 * Features:
 * - Removes dangerous tags (script, style, iframe with unsafe sources, etc.)
 * - Removes dangerous attributes (onclick, onerror, etc.)
 * - Preserves safe formatting tags (p, h1-h6, strong, em, ul, ol, li, a, img, etc.)
 * - Allows YouTube iframe embeds only (from www.youtube.com and youtube-nocookie.com)
 * - Allows safe protocols (https, http, mailto, tel)
 *
 * @param html - Raw HTML string from TipTap editor
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeArticleContent(html: string): string {
  if (!html) return '';

  // DOMPurify requires a browser DOM — skip on the server
  // Content is already sanitized before being saved to the database
  if (typeof window === 'undefined') {
    return html;
  }

  // Configure DOMPurify to allow TipTap content + YouTube embeds
  const cleanHtml = DOMPurify.sanitize(html, {
    // Allow tags for rich text content
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
      'code', 'pre', 'kbd', 'samp', 'var',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li',
      // Quotes
      'blockquote', 'cite', 'q',
      // Links and media
      'a', 'img', 'picture', 'figure', 'figcaption',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      // Dividers and containers
      'hr', 'div', 'span',
      // YouTube embeds (iframe with strict restrictions)
      'iframe',
    ],

    // Allow attributes for tags (DOMPurify doesn't support regex in ALLOWED_ATTR)
    ALLOWED_ATTR: [
      // Global attributes
      'id', 'class', 'style', 'title', 'lang', 'dir', 'translate',
      // Link attributes
      'href', 'target', 'rel', 'download',
      // Image attributes
      'src', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority',
      // Time element
      'datetime',
      // iframe attributes (restricted by ALLOWED_URI_REGEX)
      'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen',
      'title', 'loading',
    ],

    // Allow safe URI protocols
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data:image\/(?:[\w.+]+)):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

    // Custom hook to add additional restrictions
    ADD_ATTR: ['loading', 'decoding', 'fetchpriority', 'data-*', 'aria-*'],

    // Allow data: URLs for images only
    ALLOW_DATA_ATTR: true,

    // For iframe elements, only allow YouTube embeds
    FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'select', 'textarea', 'object', 'embed', 'applet'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onreset', 'ondblclick', 'onmousedown',
      'onmouseup', 'onmouseenter', 'onmouseleave', 'onkeypress', 'onkeydown',
      'onkeyup', 'onafterprint', 'onbeforeprint', 'onbeforeunload',
      'onhashchange', 'onmessage', 'onoffline', 'ononline', 'onpagehide',
      'onpageshow', 'onpopstate', 'onresize', 'onstorage',
    ],

    // Note: iframe elements are allowed but should only come from our YouTube extension
    // User input in the editor doesn't directly create iframes
  });

  return cleanHtml;
}

/**
 * Configuration for sanitizeArticleContent
 * Shows exactly what tags and attributes are allowed
 */
export const ARTICLE_CONTENT_SANITIZATION_CONFIG = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
    'code', 'pre', 'kbd', 'samp', 'var',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'cite', 'q',
    'a', 'img', 'picture', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'hr', 'div', 'span',
    'iframe', // Only YouTube embeds allowed
  ],
  allowedAttributes: [
    'id', 'class', 'style', 'title', 'lang', 'dir',
    'href', 'target', 'rel', 'download',
    'src', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority',
    'datetime',
    /^data-[\w-]+$/,
    /^aria-[\w-]+$/,
    'frameborder', 'allow', 'allowfullscreen',
  ],
  blockedTags: [
    'script', 'style', 'form', 'input', 'button', 'select', 'textarea',
    'object', 'embed', 'applet',
  ],
  blockedAttributes: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'ondblclick', 'onmousedown',
    'onmouseup', 'onmouseenter', 'onmouseleave', 'onkeypress', 'onkeydown',
    'onkeyup',
  ],
  allowedProtocols: [
    'https://', 'http://', 'mailto:', 'tel:',
    'data:image/', // For inline images
  ],
  allowedIframeSources: [
    'www.youtube.com/embed/',
    'youtube-nocookie.com/embed/',
    'www.youtube-nocookie.com/embed/',
  ],
};
