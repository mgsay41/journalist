import { unstable_cache } from 'next/cache';

/**
 * Cache utilities for performance optimization
 *
 * This module provides caching strategies for:
 * - Database queries
 * - API responses
 * - Computed data
 */

// Cache duration constants (in seconds)
export const CACHE_DURATIONS = {
  MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  HOUR: 3600,
  SIX_HOURS: 21600,
  DAY: 86400,
  WEEK: 604800,
} as const;

/**
 * Create a cached version of an async function with revalidation
 *
 * @param fn - The function to cache
 * @param keys - Cache key parts
 * @param revalidate - Revalidation time in seconds
 */
export function createCachedFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keys: string[],
  revalidate: number = CACHE_DURATIONS.FIFTEEN_MINUTES
): T {
  return unstable_cache(fn, keys, { revalidate }) as T;
}

/**
 * Cache tag constants for cache invalidation
 */
export const CACHE_TAGS = {
  // Article tags
  ARTICLES: 'articles',
  ARTICLE: (id: string) => `article-${id}`,
  ARTICLE_SLUG: (slug: string) => `article-slug-${slug}`,

  // Category tags
  CATEGORIES: 'categories',
  CATEGORY: (id: string) => `category-${id}`,
  CATEGORY_SLUG: (slug: string) => `category-slug-${slug}`,

  // Tag tags
  TAGS: 'tags',
  TAG: (id: string) => `tag-${id}`,
  TAG_SLUG: (slug: string) => `tag-slug-${slug}`,

  // Media tags
  IMAGES: 'images',
  IMAGE: (id: string) => `image-${id}`,

  // Analytics tags
  ANALYTICS: 'analytics',
  ARTICLE_VIEWS: (id: string) => `article-views-${id}`,

  // Settings tags
  SETTINGS: 'settings',

  // Public content tags
  PUBLIC_ARTICLES: 'public-articles',
  PUBLIC_CATEGORIES: 'public-categories',
  PUBLIC_TAGS: 'public-tags',
} as const;

/**
 * Simple in-memory cache for frequently accessed data
 * This uses a Map with TTL (time-to-live) support
 */
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number = CACHE_DURATIONS.FIFTEEN_MINUTES): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete entries matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache();

/**
 * Cache wrapper for database queries
 *
 * @param queryFn - The query function to execute
 * @param key - Cache key
 * @param ttl - Time to live in seconds
 */
export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  key: string,
  ttl: number = CACHE_DURATIONS.FIFTEEN_MINUTES
): Promise<T> {
  // Try memory cache first
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute query
  const result = await queryFn();

  // Store in memory cache
  memoryCache.set(key, result, ttl);

  return result;
}

/**
 * Invalidate cache by pattern
 *
 * @param pattern - Pattern to match cache keys
 */
export function invalidateCache(pattern: string): void {
  memoryCache.deletePattern(pattern);
}

/**
 * Batch cache invalidation
 *
 * @param patterns - Array of patterns to invalidate
 */
export function invalidateCacheBatch(patterns: string[]): void {
  for (const pattern of patterns) {
    invalidateCache(pattern);
  }
}

/**
 * Cache key generator helper
 */
export function generateCacheKey(parts: (string | number)[], prefix = 'cache'): string {
  return [prefix, ...parts].join(':');
}

/**
 * Cache article data with appropriate revalidation
 */
export function cacheArticleData<T>(
  fn: () => Promise<T>,
  articleId: string,
  revalidate: number = CACHE_DURATIONS.HOUR
) {
  return createCachedFn(fn, [CACHE_TAGS.ARTICLE(articleId)], revalidate)();
}

/**
 * Cache public article list with ISR
 */
export function cachePublicArticles<T>(
  fn: () => Promise<T>,
  revalidate: number = CACHE_DURATIONS.FIFTEEN_MINUTES
) {
  return createCachedFn(fn, [CACHE_TAGS.PUBLIC_ARTICLES], revalidate)();
}

/**
 * Cache category data
 */
export function cacheCategoryData<T>(
  fn: () => Promise<T>,
  categoryId: string,
  revalidate: number = CACHE_DURATIONS.SIX_HOURS
) {
  return createCachedFn(fn, [CACHE_TAGS.CATEGORY(categoryId)], revalidate)();
}

/**
 * Cache settings data (less frequent changes)
 */
export function cacheSettingsData<T>(
  fn: () => Promise<T>,
  revalidate: number = CACHE_DURATIONS.HOUR
) {
  return createCachedFn(fn, [CACHE_TAGS.SETTINGS], revalidate)();
}

/**
 * Cache analytics data (shorter TTL for freshness)
 */
export function cacheAnalyticsData<T>(
  fn: () => Promise<T>,
  key: string,
  revalidate: number = CACHE_DURATIONS.FIVE_MINUTES
) {
  return createCachedFn(fn, [CACHE_TAGS.ANALYTICS, key], revalidate)();
}
