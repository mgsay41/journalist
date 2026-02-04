/**
 * Rate Limiting Utilities
 *
 * Provides in-memory rate limiting for API endpoints
 * Uses a sliding window approach for accurate rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 60 * 1000);
}

/**
 * Rate limit options
 */
export interface RateLimitOptions {
  /** Number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Custom identifier generator (defaults to IP address) */
  identifier?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export function rateLimit(options: RateLimitOptions): RateLimitResult {
  const { limit, window, identifier = 'default' } = options;
  const now = Date.now();
  const windowMs = window * 1000;

  // Get or create entry
  let entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);

    return {
      success: true,
      remaining: limit - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware helper for API routes
 *
 * @param request - Next.js request object
 * @param options - Rate limit options
 * @returns Rate limit result or null if not rate limited
 */
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  // Get identifier from IP address
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const identifier = `${options.identifier || 'default'}:${ip}`;

  return rateLimit({ ...options, identifier });
}

/**
 * Create a rate-limited API route handler wrapper
 *
 * @param handler - The API route handler
 * @param options - Rate limit options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  options: RateLimitOptions
) {
  return async (...args: T): Promise<Response> => {
    // Extract request from args (assuming it's the first argument)
    const request = args[0] as Request;

    const result = await checkRateLimit(request, options);

    if (result === null || !result.success) {
      const resetAt = result?.resetAt || Date.now() + 60000;
      return new Response(
        JSON.stringify({
          error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': options.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetAt).toISOString(),
            'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful response
    const response = await handler(...args);

    // Clone response to add headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', options.limit.toString());
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

    return newResponse;
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  /** Strict rate limit for sensitive operations (login, etc.) */
  strict: { limit: 5, window: 60 }, // 5 requests per minute

  /** Moderate rate limit for general API operations */
  moderate: { limit: 20, window: 60 }, // 20 requests per minute

  /** Relaxed rate limit for read operations */
  relaxed: { limit: 100, window: 60 }, // 100 requests per minute

  /** Generous rate limit for public endpoints */
  public: { limit: 1000, window: 3600 }, // 1000 requests per hour
} as const;
