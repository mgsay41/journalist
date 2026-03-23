import { unstable_cache } from 'next/cache';
import { LRUCache } from 'lru-cache';

/**
 * Cache utilities for performance optimization
 *
 * Phase 2 Backend Audit - Enhanced with:
 * - Database query caching
 * - API response caching
 * - Computed data caching
 * - Cache statistics tracking
 * - LRU eviction policy
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
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

// Global cache statistics
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  size: 0,
  hitRate: 0,
};

/**
 * Update cache statistics
 */
function updateStats(type: 'hit' | 'miss' | 'set' | 'delete', cacheSize?: number): void {
  if (type === 'hit') {
    stats.hits++;
  } else if (type === 'miss') {
    stats.misses++;
  } else if (type === 'set') {
    stats.sets++;
  } else if (type === 'delete') {
    stats.deletes++;
  }

  stats.size = cacheSize ?? memoryCache.getSize();
  const total = stats.hits + stats.misses;
  stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
}

/**
 * Create a cached version of an async function with revalidation
 *
 * @param fn - The function to cache
 * @param keys - Cache key parts
 * @param revalidate - Revalidation time in seconds
 */
export function createCachedFn<T extends (...args: unknown[]) => Promise<unknown>>(
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
 * Simple in-memory LRU cache for frequently accessed data.
 * Uses the lru-cache package for O(1) get/set/eviction.
 */
class MemoryCache {
  private lru = new LRUCache<string, { value: unknown; expires: number }>({ max: 1000 });

  getSize(): number {
    return this.lru.size;
  }

  get<T>(key: string): T | null {
    const entry = this.lru.get(key);
    if (!entry) {
      updateStats('miss', this.lru.size);
      return null;
    }
    if (Date.now() > entry.expires) {
      this.lru.delete(key);
      updateStats('miss', this.lru.size);
      return null;
    }
    updateStats('hit', this.lru.size);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = CACHE_DURATIONS.FIFTEEN_MINUTES): void {
    this.lru.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    updateStats('set', this.lru.size);
  }

  delete(key: string): void {
    if (this.lru.has(key)) {
      this.lru.delete(key);
      updateStats('delete', this.lru.size);
    }
  }

  clear(): void {
    const size = this.lru.size;
    this.lru.clear();
    for (let i = 0; i < size; i++) {
      updateStats('delete', this.lru.size);
    }
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let deleted = 0;
    for (const key of this.lru.keys()) {
      if (regex.test(key)) {
        this.lru.delete(key);
        deleted++;
      }
    }
    for (let i = 0; i < deleted; i++) {
      updateStats('delete', this.lru.size);
    }
  }

  getStats() {
    return {
      size: this.lru.size,
      maxEntries: 1000,
      keys: Array.from(this.lru.keys()),
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

/**
 * Get cache statistics for monitoring
 * Phase 2 Backend Audit - Performance monitoring
 */
export function getCacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.size = memoryCache.getSize();
  stats.hitRate = 0;
}

/**
 * Get cache performance report
 */
export function getCacheReport(): {
  stats: CacheStats;
  efficiency: string;
  recommendations: string[];
} {
  const hitRate = stats.hitRate;
  const efficiency =
    hitRate >= 80 ? 'excellent' :
    hitRate >= 60 ? 'good' :
    hitRate >= 40 ? 'fair' :
    'poor';

  const recommendations: string[] = [];

  if (hitRate < 40) {
    recommendations.push('Consider increasing cache TTL for frequently accessed data');
    recommendations.push('Review cache key patterns - may be too specific');
  }

  if (stats.size > 800) {
    recommendations.push('Cache is near capacity. Consider increasing maxEntries or using Redis.');
  }

  if (stats.misses > stats.hits * 2) {
    recommendations.push('High miss rate detected. Review cache strategy.');
  }

  return {
    stats: getCacheStats(),
    efficiency,
    recommendations,
  };
}