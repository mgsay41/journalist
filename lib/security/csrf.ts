/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Provides CSRF token generation and validation for API routes.
 * Works with Better Auth's built-in CSRF protection.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (required for Vercel/serverless — tokens survive restarts and are
 * shared across instances). Falls back to in-memory for local development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';

/**
 * CSRF token storage interface
 */
interface CsrfTokenData {
  token: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Upstash Redis client — lazily initialised, null when env vars are absent
// ---------------------------------------------------------------------------
let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

const CSRF_REDIS_PREFIX = 'csrf:';

// ---------------------------------------------------------------------------
// In-memory fallback (development only)
// ---------------------------------------------------------------------------

// In-memory token storage (fallback when Redis is not configured)
const csrfTokenStore = new Map<string, CsrfTokenData>();

// Token expiration time (24 hours)
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

// Hard cap to prevent unbounded memory growth
const CSRF_STORE_MAX_SIZE = 5000;

/**
 * Generate a cryptographically random CSRF token
 */
function generateRandomToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new CSRF token for a session
 *
 * @param sessionId - The session ID to bind the token to
 * @returns The CSRF token
 */
export async function createCsrfToken(sessionId: string): Promise<string> {
  const token = generateRandomToken();
  const now = Date.now();

  const tokenData: CsrfTokenData = {
    token,
    sessionId,
    createdAt: now,
    expiresAt: now + CSRF_TOKEN_EXPIRY,
  };

  const redis = getRedis();
  if (redis) {
    // Store in Redis with TTL (survives serverless restarts, shared across instances)
    await redis.set(
      `${CSRF_REDIS_PREFIX}${token}`,
      JSON.stringify(tokenData),
      { ex: Math.ceil(CSRF_TOKEN_EXPIRY / 1000) }
    );
    return token;
  }

  // In-memory fallback (development only — not reliable in serverless production)
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[csrf] WARNING: Upstash Redis is not configured. ' +
      'Falling back to in-memory CSRF token storage which does not survive cold starts ' +
      'and is not shared across serverless instances. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    );
  }

  if (csrfTokenStore.size >= CSRF_STORE_MAX_SIZE) {
    cleanupExpiredTokens();
    if (csrfTokenStore.size >= CSRF_STORE_MAX_SIZE) {
      throw new Error('CSRF token store capacity exceeded');
    }
  }

  csrfTokenStore.set(token, tokenData);
  cleanupExpiredTokens();

  return token;
}

/**
 * Validate a CSRF token
 *
 * @param token - The CSRF token to validate
 * @param sessionId - The session ID to verify against
 * @returns True if valid, false otherwise
 */
export async function validateCsrfToken(token: string, sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(`${CSRF_REDIS_PREFIX}${token}`);
    if (!raw) return false;

    let tokenData: CsrfTokenData;
    try {
      tokenData = typeof raw === 'string' ? JSON.parse(raw) : (raw as CsrfTokenData);
    } catch {
      return false;
    }

    if (Date.now() > tokenData.expiresAt) {
      await redis.del(`${CSRF_REDIS_PREFIX}${token}`);
      return false;
    }

    return tokenData.sessionId === sessionId;
  }

  // In-memory fallback
  const tokenData = csrfTokenStore.get(token);
  if (!tokenData) return false;

  if (Date.now() > tokenData.expiresAt) {
    csrfTokenStore.delete(token);
    return false;
  }

  return tokenData.sessionId === sessionId;
}

/**
 * Invalidate a CSRF token after use
 *
 * @param token - The CSRF token to invalidate
 */
export async function invalidateCsrfToken(token: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`${CSRF_REDIS_PREFIX}${token}`);
    return;
  }
  csrfTokenStore.delete(token);
}

/**
 * Clean up expired tokens from the store
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of csrfTokenStore.entries()) {
    if (now > data.expiresAt) {
      csrfTokenStore.delete(token);
    }
  }
}

/**
 * Extract CSRF token from request
 *
 * @param request - Next.js request
 * @returns The CSRF token or null
 */
export function extractCsrfToken(request: NextRequest): string | null {
  // Check header first (preferred method)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // Fall back to form body
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    // For JSON requests, we'd need to parse the body
    // This is handled in the middleware
  }

  return null;
}

/**
 * Get session ID from request
 *
 * @param request - Next.js request
 * @returns The session ID or null
 */
async function getSessionId(request: NextRequest): Promise<string | null> {
  // Get session token from cookie
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });

  const sessionToken =
    cookies['better_auth_session'] ||
    cookies['better-auth.session_token'] ||
    cookies['better_auth_session_token'];

  if (!sessionToken) {
    return null;
  }

  // Get session from database
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    select: { id: true },
  });

  return session?.id || null;
}

/**
 * CSRF validation middleware
 *
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH)
 *
 * @param request - Next.js request
 * @returns Response if validation fails, null if valid
 */
export async function validateCsrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method;

  // Only validate state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  // Get session ID
  const sessionId = await getSessionId(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: 'غير مصرح - جلسة غير صالحة' },
      { status: 401 }
    );
  }

  // Extract CSRF token
  const csrfToken = extractCsrfToken(request);
  if (!csrfToken) {
    return NextResponse.json(
      { error: 'رمز CSRF مفقود' },
      { status: 403 }
    );
  }

  // Validate CSRF token
  if (!(await validateCsrfToken(csrfToken, sessionId))) {
    return NextResponse.json(
      { error: 'رمز CSRF غير صالح' },
      { status: 403 }
    );
  }

  // Token is valid, invalidate it (one-time use)
  await invalidateCsrfToken(csrfToken);

  return null;
}

/**
 * Middleware wrapper that requires CSRF protection
 *
 * @param handler - The API route handler
 * @returns Wrapped handler with CSRF validation
 */
export function withCsrfProtection(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...rest: any[]): Promise<NextResponse> => {
    const csrfError = await validateCsrfMiddleware(request);
    if (csrfError) return csrfError;

    return handler(request, ...rest);
  };
}

/**
 * Get CSRF token API endpoint response
 *
 * @param request - Next.js request
 * @returns Response with CSRF token
 */
export async function getCsrfTokenResponse(request: NextRequest): Promise<NextResponse> {
  const sessionId = await getSessionId(request);

  if (!sessionId) {
    return NextResponse.json(
      { error: 'يجب تسجيل الدخول أولاً' },
      { status: 401 }
    );
  }

  const token = await createCsrfToken(sessionId);

  return NextResponse.json({ csrfToken: token });
}
