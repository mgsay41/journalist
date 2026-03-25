/**
 * Client-side CSRF Protection Utilities
 *
 * Provides utilities for fetching and including CSRF tokens in API requests.
 * Phase 2 Frontend Audit - CSRF Protection
 */

/**
 * Fetch a fresh CSRF token from the server
 *
 * @returns The CSRF token
 * @throws Error if fetching fails
 */
export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/admin/csrf', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('فشل في جلب رمز CSRF');
  }

  const data = await response.json();
  return data.csrfToken;
}

/**
 * Cached CSRF token storage
 */
let cachedCsrfToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get a CSRF token, using cache if available
 *
 * @returns The CSRF token
 */
export async function getCsrfToken(): Promise<string> {
  // Check if cached token is still valid (5 minute cache)
  if (cachedCsrfToken && Date.now() < tokenExpiresAt) {
    return cachedCsrfToken;
  }

  // Fetch new token
  const token = await fetchCsrfToken();
  cachedCsrfToken = token;
  tokenExpiresAt = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes

  return token;
}

/**
 * Enhanced fetch wrapper that includes CSRF token
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-CSRF-Token': csrfToken,
        },
      });

      // If the server rejected the token (stale cache after server restart, etc.),
      // clear the cache, fetch a fresh token, and retry once.
      if (response.status === 403) {
        clearCsrfTokenCache();
        const freshToken = await getCsrfToken();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-CSRF-Token': freshToken,
          },
        });
      }

      return response;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      // Fall back to regular fetch if CSRF fails
      return fetch(url, options);
    }
  }

  return fetch(url, options);
}

/**
 * Clear cached CSRF token (call after logout)
 */
export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null;
  tokenExpiresAt = 0;
}

/**
 * React hook for CSRF token management
 *
 * @returns Object with CSRF token and refetch function
 */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetchToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await fetchCsrfToken();
      setCsrfToken(token);
      clearCsrfTokenCache(); // Clear global cache when manually refetching
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchToken();
  }, [refetchToken]);

  return { csrfToken, isLoading, error, refetchToken };
}

// Import React hooks for the hook above
import { useState, useCallback, useEffect } from 'react';
