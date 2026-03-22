import { memoryCache, getCacheStats, resetCacheStats, getCacheReport, invalidateCache } from '@/lib/cache'

// Mock timer for TTL testing
jest.useFakeTimers()

describe('MemoryCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    memoryCache.clear()
    resetCacheStats()
  })

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      memoryCache.set('test-key', { value: 'test-data' })
      const result = memoryCache.get('test-key')
      expect(result).toEqual({ value: 'test-data' })
    })

    it('should return null for non-existent keys', () => {
      const result = memoryCache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should handle different data types', () => {
      memoryCache.set('string', 'test')
      memoryCache.set('number', 123)
      memoryCache.set('boolean', true)
      memoryCache.set('object', { nested: { data: 'value' } })
      memoryCache.set('array', [1, 2, 3])

      expect(memoryCache.get('string')).toBe('test')
      expect(memoryCache.get('number')).toBe(123)
      expect(memoryCache.get('boolean')).toBe(true)
      expect(memoryCache.get('object')).toEqual({ nested: { data: 'value' } })
      expect(memoryCache.get('array')).toEqual([1, 2, 3])
    })

    it('should update stats on set and get', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.get('key1')
      memoryCache.get('non-existent')

      const stats = getCacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.sets).toBe(1)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      memoryCache.set('temp-key', 'value', 1) // 1 second TTL

      // Should be available immediately
      expect(memoryCache.get('temp-key')).toBe('value')

      // Fast forward past TTL
      jest.advanceTimersByTime(1100)

      // Should be expired
      expect(memoryCache.get('temp-key')).toBeNull()
    })

    it('should not expire before TTL', () => {
      memoryCache.set('temp-key', 'value', 10) // 10 second TTL

      jest.advanceTimersByTime(5000) // Advance 5 seconds

      expect(memoryCache.get('temp-key')).toBe('value')
    })
  })

  describe('delete', () => {
    it('should delete existing entries', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.delete('key1')

      expect(memoryCache.get('key1')).toBeNull()
    })

    it('should handle deleting non-existent entries', () => {
      expect(() => memoryCache.delete('non-existent')).not.toThrow()
    })

    it('should update delete stats', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.delete('key1')

      const stats = getCacheStats()
      expect(stats.deletes).toBe(1)
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.set('key2', 'value2')
      memoryCache.set('key3', 'value3')

      memoryCache.clear()

      expect(memoryCache.get('key1')).toBeNull()
      expect(memoryCache.get('key2')).toBeNull()
      expect(memoryCache.get('key3')).toBeNull()
    })
  })

  describe('invalidateCache', () => {
    it('should delete entries matching pattern', () => {
      memoryCache.set('user:1:data', 'value1')
      memoryCache.set('user:2:data', 'value2')
      memoryCache.set('article:1:data', 'value3')

      invalidateCache('user:*')

      expect(memoryCache.get('user:1:data')).toBeNull()
      expect(memoryCache.get('user:2:data')).toBeNull()
      expect(memoryCache.get('article:1:data')).toBe('value3')
    })
  })

  describe('LRU eviction', () => {
    it('should evict entries when cache exceeds maxEntries', () => {
      // Fill cache beyond maxEntries (1000)
      for (let i = 0; i < 1005; i++) {
        memoryCache.set(`key-${i}`, `value-${i}`)
      }

      // Cache should not exceed maxEntries by more than 1 (the item that triggered eviction)
      const stats = memoryCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(1001)
    })

    it('should evict older entries when accessing newer ones', () => {
      // Fill cache to near capacity
      for (let i = 0; i < 999; i++) {
        memoryCache.set(`key-${i}`, `value-${i}`)
      }

      // Add a new entry and access old ones to make them recently used
      memoryCache.set('key-new-1', 'value-new-1')
      memoryCache.get('key-500') // Access middle entry
      memoryCache.get('key-900') // Access later entry

      // Add more entries to trigger eviction
      for (let i = 1000; i < 1010; i++) {
        memoryCache.set(`key-${i}`, `value-${i}`)
      }

      // Verify cache stays within limits
      const stats = memoryCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(1000)
    })
  })

  describe('cache statistics', () => {
    it('should track hit rate correctly', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.set('key2', 'value2')

      memoryCache.get('key1') // hit
      memoryCache.get('key2') // hit
      memoryCache.get('key3') // miss

      const stats = getCacheStats()
      expect(stats.hitRate).toBeCloseTo(66.67, 1) // 2/3 = 66.67%
    })

    it('should reset stats correctly', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.get('key1')

      resetCacheStats()

      const stats = getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.sets).toBe(0)
      expect(stats.deletes).toBe(0)
    })
  })

  describe('cache report', () => {
    it('should generate efficiency report', () => {
      // Generate some activity
      for (let i = 0; i < 100; i++) {
        memoryCache.set(`key-${i}`, `value-${i}`)
        memoryCache.get(`key-${i}`)
      }

      // Add some misses
      memoryCache.get('non-existent-1')
      memoryCache.get('non-existent-2')

      const report = getCacheReport()

      expect(report.stats).toBeDefined()
      expect(report.efficiency).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should provide recommendations for poor performance', () => {
      // Create poor hit rate scenario
      for (let i = 0; i < 10; i++) {
        memoryCache.set(`key-${i}`, `value-${i}`)
        memoryCache.get(`key-${i}`) // 10 hits
      }

      // Add many misses
      for (let i = 0; i < 50; i++) {
        memoryCache.get(`miss-${i}`)
      }

      const report = getCacheReport()

      expect(report.efficiency).toBe('poor')
      expect(report.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.set('key2', 'value2')

      const stats = memoryCache.getStats()

      expect(stats.size).toBe(2)
      expect(stats.maxEntries).toBe(1000)
      expect(Array.isArray(stats.keys)).toBe(true)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })
})
