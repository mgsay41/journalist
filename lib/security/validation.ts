/**
 * Input Validation Middleware
 *
 * Provides comprehensive input validation for security:
 * - Request body size limits
 * - SQL injection prevention
 * - XSS prevention
 * - Path traversal prevention
 * - Command injection prevention
 *
 * Phase 1 Backend Audit - Critical Security Fix
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Validation configuration
 */
const VALIDATION_CONFIG = {
  /** Maximum request body size (10MB) */
  MAX_BODY_SIZE: 10 * 1024 * 1024,
  /** Maximum query string length (2048 chars) */
  MAX_QUERY_LENGTH: 2048,
  /** Maximum header value length (8192 chars) */
  MAX_HEADER_LENGTH: 8192,
} as const;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|SCRIPT)\b)/i,
  /(;|(\-\-)|(\||\|)|(\&\&)|(\*|\/))/i,
  /(\bOR\b|\bAND\b).*=.*=/i,
  /['"]\s*(OR|AND)\s*['"]/i,
  /(\=|LIKE)\s*['"]*%['"]*/i,
  /exec\s*\(|execute\s*\(/i,
];

/**
 * XSS patterns to detect
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /<img[^>]*onerror[^>]*>/gi,
];

/**
 * Path traversal patterns to detect
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\/\\]/,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /%252e%252e[\/\\]/i,
  /\/etc\//i,
  /\/proc\//i,
  /C:\\Windows/i,
  /\.\.\\/i,
];

/**
 * Command injection patterns to detect
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bsystem\s*\(/i,
  /\bpassthru\s*\(/i,
  /\bshell_exec\s*\(/i,
  /\bpopen\s*\(/i,
  /\bproc_open\s*\(/i,
];

/**
 * Sanitize a string value by removing dangerous characters
 *
 * @param value - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Check for SQL injection in a string
 *
 * @param value - String to check
 * @returns True if SQL injection detected
 */
export function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(value);
  });
}

/**
 * Check for XSS in a string
 *
 * @param value - String to check
 * @returns True if XSS detected
 */
export function detectXss(value: string): boolean {
  return XSS_PATTERNS.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(value);
  });
}

/**
 * Check for path traversal in a string
 *
 * @param value - String to check
 * @returns True if path traversal detected
 */
export function detectPathTraversal(value: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(value);
  });
}

/**
 * Check for command injection in a string
 *
 * @param value - String to check
 * @returns True if command injection detected
 */
export function detectCommandInjection(value: string): boolean {
  return COMMAND_INJECTION_PATTERNS.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(value);
  });
}

/**
 * Validate a string value against common attacks
 *
 * @param value - String to validate
 * @param fieldName - Field name for error messages
 * @returns Validation result
 */
export function validateString(value: string, fieldName?: string): ValidationResult {
  // Check for null bytes
  if (value.includes('\0')) {
    return {
      valid: false,
      error: `${fieldName || 'الحقل'} يحتوي على أحرف غير صالحة`,
      statusCode: 400,
    };
  }

  // Check for SQL injection
  if (detectSqlInjection(value)) {
    return {
      valid: false,
      error: 'تم اكتشاف محاولة حقن SQL',
      statusCode: 400,
    };
  }

  // Check for XSS (but allow safe HTML for rich text content)
  if (detectXss(value)) {
    return {
      valid: false,
      error: 'تم اكتشاف محاولة XSS',
      statusCode: 400,
    };
  }

  // Check for path traversal
  if (detectPathTraversal(value)) {
    return {
      valid: false,
      error: 'تم اكتشاف محاولة اجتياز المسار',
      statusCode: 400,
    };
  }

  // Check for command injection
  if (detectCommandInjection(value)) {
    return {
      valid: false,
      error: 'تم اكتشاف محاولة حقن الأوامر',
      statusCode: 400,
    };
  }

  return { valid: true };
}

/**
 * Validate request body size
 *
 * @param request - Next.js request
 * @returns Validation result
 */
export async function validateRequestBodySize(request: NextRequest): Promise<ValidationResult> {
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > VALIDATION_CONFIG.MAX_BODY_SIZE) {
      return {
        valid: false,
        error: 'حجم الطلب كبير جداً',
        statusCode: 413,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate query string length
 *
 * @param request - Next.js request
 * @returns Validation result
 */
export function validateQueryString(request: NextRequest): ValidationResult {
  const queryString = request.nextUrl.search;

  if (queryString.length > VALIDATION_CONFIG.MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: 'معلمات الاستعلام طويلة جداً',
      statusCode: 414,
    };
  }

  return { valid: true };
}

/**
 * Validate request headers
 *
 * @param request - Next.js request
 * @returns Validation result
 */
export function validateRequestHeaders(request: NextRequest): ValidationResult {
  for (const [key, value] of request.headers.entries()) {
    // Skip certain headers that can be long
    if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'authorization') {
      continue;
    }

    if (value && value.length > VALIDATION_CONFIG.MAX_HEADER_LENGTH) {
      return {
        valid: false,
        error: 'قيمة الرأس طويلة جداً',
        statusCode: 400,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate JSON request body
 *
 * @param body - Parsed JSON body
 * @param schema - Optional Zod schema for validation
 * @returns Validation result
 */
export function validateJsonBody(body: unknown, schema?: z.ZodSchema): ValidationResult {
  // Check body type
  if (typeof body !== 'object' || body === null) {
    return {
      valid: false,
      error: 'نص الطلب غير صالح',
      statusCode: 400,
    };
  }

  // Validate against Zod schema if provided
  if (schema) {
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        valid: false,
        error: result.error.issues[0]?.message || 'بيانات غير صالحة',
        statusCode: 400,
      };
    }
  }

  // Recursively validate string values
  function validateObject(obj: unknown): ValidationResult {
    if (typeof obj === 'string') {
      return validateString(obj);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = validateObject(item);
        if (!result.valid) return result;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        // Skip HTML content validation for rich text fields
        if (key === 'content' || key === 'excerpt' || key === 'metaDescription') {
          // Still check for script tags but allow other HTML
          if (typeof value === 'string' && /<script[^>]*>.*?<\/script>/gi.test(value)) {
            return {
              valid: false,
              error: 'المحتوى يحتوي على نصوص خطيرة',
              statusCode: 400,
            };
          }
          continue;
        }

        const result = validateObject(value);
        if (!result.valid) return result;
      }
    }

    return { valid: true };
  }

  return validateObject(body);
}

/**
 * Comprehensive request validation
 *
 * @param request - Next.js request
 * @param options - Validation options
 * @returns Validation result or null if valid
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    maxBodySize?: number;
    schema?: z.ZodSchema;
    skipBodyValidation?: boolean;
  } = {}
): Promise<ValidationResult | null> {
  // Validate query string
  const queryResult = validateQueryString(request);
  if (!queryResult.valid) return queryResult;

  // Validate headers
  const headersResult = validateRequestHeaders(request);
  if (!headersResult.valid) return headersResult;

  // Validate body size for POST/PUT/PATCH requests
  if (!options.skipBodyValidation && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodySizeResult = await validateRequestBodySize(request);
    if (!bodySizeResult.valid) return bodySizeResult;

    // Parse and validate JSON body
    try {
      const body = await request.json();
      return validateJsonBody(body, options.schema);
    } catch (error) {
      // Body not JSON or invalid JSON
      return {
        valid: false,
        error: 'نص الطلب غير صالح',
        statusCode: 400,
      };
    }
  }

  return null; // Valid
}

/**
 * Middleware wrapper for request validation
 *
 * @param handler - API route handler
 * @param options - Validation options
 * @returns Wrapped handler with validation
 */
export function withValidation<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: {
    maxBodySize?: number;
    schema?: z.ZodSchema;
    skipBodyValidation?: boolean;
  } = {}
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    const validationResult = await validateRequest(request, options);

    if (validationResult && !validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.statusCode || 400 }
      );
    }

    return handler(...args);
  };
}

/**
 * Sanitize response data by removing sensitive fields
 *
 * @param data - Data to sanitize
 * @param sensitiveFields - Array of field names to redact
 * @returns Sanitized data
 */
export function sanitizeResponse<T>(
  data: T,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey']
): T {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      (sanitized as any)[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as any)[key] = sanitizeResponse(value, sensitiveFields);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeResponse(item, sensitiveFields)
          : item
      );
    }
  }

  return sanitized;
}

/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate slug format
 *
 * @param slug - Slug to validate
 * @returns True if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  // Slugs should only contain lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validate Arabic text (allows Arabic characters, numbers, and common punctuation)
 *
 * @param text - Text to validate
 * @returns True if valid Arabic text
 */
export function isValidArabicText(text: string): boolean {
  // Allow Arabic characters, numbers, spaces, and common punctuation
  const arabicRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\s\.,;:!?()'"\\-]+$/;
  return arabicRegex.test(text);
}
