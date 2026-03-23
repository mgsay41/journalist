/**
 * Security Middleware
 *
 * Provides middleware functions for:
 * - Authentication checks
 * - Authorization checks
 * - CSRF protection
 * - Request logging
 *
 * Phase 2 Frontend Audit - Added CSRF protection middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfMiddleware } from './csrf';

/**
 * Check if user is authenticated
 * Delegates to getServerSession from lib/auth.ts for consistent session handling.
 *
 * @param _request - Next.js request (unused; session is read from cookies via Next.js headers)
 * @returns Response if unauthorized, null if authorized
 */
export async function requireAuth(_request: NextRequest) {
  const { getServerSession } = await import('@/lib/auth');
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { error: 'غير مصرح - يرجى تسجيل الدخول' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Middleware wrapper that requires authentication
 *
 * @param handler - The API route handler
 * @returns Wrapped handler with authentication check
 */
export function withAuth<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...rest: TArgs): Promise<NextResponse> => {
    const authError = await requireAuth(request);
    if (authError) return authError;

    return handler(request, ...rest);
  };
}

/**
 * Middleware wrapper that requires both authentication AND CSRF protection
 *
 * Use this for all state-changing API routes (POST, PUT, DELETE, PATCH)
 *
 * @param handler - The API route handler
 * @returns Wrapped handler with auth and CSRF checks
 *
 * @example
 * export const POST = withAuthCsrf(async (request) => {
 *   // Your handler logic here
 * });
 */
export function withAuthCsrf<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...rest: TArgs): Promise<NextResponse> => {
    // Check authentication first
    const authError = await requireAuth(request);
    if (authError) return authError;

    // Check CSRF token
    const csrfError = await validateCsrfMiddleware(request);
    if (csrfError) return csrfError;

    return handler(request, ...rest);
  };
}

/**
 * Rate limit middleware wrapper
 *
 * @param handler - The API route handler
 * @param options - Rate limit options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimitMiddleware<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>,
  options: { limit: number; window: number; identifier?: string }
) {
  return async (request: NextRequest, ...rest: TArgs): Promise<NextResponse> => {
    const { checkRateLimit } = await import('./rate-limit');

    const result = await checkRateLimit(request, options);

    if (!result?.success) {
      return NextResponse.json(
        {
          error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.',
          retryAfter: Math.ceil((result!.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': options.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result!.resetAt).toISOString(),
            'Retry-After': Math.ceil((result!.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Execute handler and add rate limit headers
    const response = await handler(request, ...rest);

    // Add rate limit headers to the response
    response.headers.set('X-RateLimit-Limit', options.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result!.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result!.resetAt).toISOString());

    return response;
  };
}

/**
 * Combine multiple middleware
 *
 * @param handler - The API route handler
 * @param middleware - Array of middleware functions
 * @returns Wrapped handler with all middleware applied
 */
export function composeMiddleware<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>,
  ...middleware: Array<(
    handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>
  ) => (request: NextRequest, ...args: TArgs) => Promise<NextResponse>>
) {
  return middleware.reduceRight(
    (acc, mw) => mw(acc),
    handler
  );
}

/**
 * Log API request for security auditing
 *
 * @param request - Next.js request
 * @param response - Response object
 * @param duration - Request duration in ms
 */
export function logRequest(
  request: NextRequest,
  response: { status: number },
  duration?: number
): void {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.url;
  const status = response.status;
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  console.log(JSON.stringify({
    timestamp,
    method,
    url,
    status,
    duration,
    ip,
    userAgent: userAgent.substring(0, 200), // Truncate long user agents
  }));
}

/**
 * Get client IP address from request
 *
 * @param request - Next.js request
 * @returns IP address
 */
export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Validate request origin for CSRF protection
 *
 * @param request - Next.js request
 * @param allowedOrigins - List of allowed origins
 * @returns True if origin is valid
 */
export function validateOrigin(
  request: NextRequest,
  allowedOrigins: string[] = []
): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Allow same-origin requests
  if (!origin || origin === `https://${host}` || origin === `http://${host}`) {
    return true;
  }

  // Check against allowed origins
  return allowedOrigins.some(allowed => {
    const allowedUrl = new URL(allowed);
    const originUrl = new URL(origin);
    return allowedUrl.origin === originUrl.origin;
  });
}

/**
 * Security headers for API responses
 *
 * @returns Headers object with security headers
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

/**
 * Validate file upload security
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Object with valid flag and error message
 */
export async function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): Promise<{ valid: boolean; error?: string }> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى ${Math.round(maxSize / 1024 / 1024)} ميجابايت`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'نوع الملف غير مسموح',
    };
  }

  // Check file extension
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: 'امتداد الملف غير مسموح',
    };
  }

  // Validate file contents (check magic numbers for images)
  if (file.type.startsWith('image/')) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Check PNG magic number
    if (file.type === 'image/png') {
      if (view.getUint32(0) !== 0x89504e47) {
        return { valid: false, error: 'ملف PNG غير صالح' };
      }
    }

    // Check JPEG magic number
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      if (view.getUint16(0) !== 0xffd8) {
        return { valid: false, error: 'ملف JPEG غير صالح' };
      }
    }

    // Check GIF magic number
    if (file.type === 'image/gif') {
      if (view.getUint32(0) !== 0x47494638) {
        return { valid: false, error: 'ملف GIF غير صالح' };
      }
    }

    // Check WebP magic number
    if (file.type === 'image/webp') {
      if (view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) {
        return { valid: false, error: 'ملف WebP غير صالح' };
      }
    }
  }

  return { valid: true };
}
