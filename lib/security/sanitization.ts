/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize and validate user input
 * to prevent XSS and injection attacks
 */

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
  let sanitized = html
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
 * Sanitize SQL input (additional layer on top of Prisma)
 *
 * @param input - Raw SQL input
 * @returns Sanitized string
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';

  // Remove SQL injection patterns
  return input
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/;/g, '') // Remove statement terminators
    .replace(/\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b/gi, '') // Remove SQL keywords
    .trim();
}

/**
 * Validate integer within range
 *
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Valid integer or null
 */
export function validateInt(value: any, min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): number | null {
  const num = parseInt(value, 10);

  if (isNaN(num) || num < min || num > max) {
    return null;
  }

  return num;
}

/**
 * Validate boolean value
 *
 * @param value - Value to validate
 * @returns Boolean value or null
 */
export function validateBoolean(value: any): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return null;
}

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
