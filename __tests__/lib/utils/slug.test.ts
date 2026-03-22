import { generateSlug } from '@/lib/utils/slug'

describe('generateSlug', () => {
  describe('with English text', () => {
    it('should convert spaces to hyphens', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
    })

    it('should convert to lowercase', () => {
      expect(generateSlug('HELLO WORLD')).toBe('hello-world')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Hello, World!')).toBe('hello-world')
    })

    it('should handle multiple spaces', () => {
      expect(generateSlug('Hello    World   Test')).toBe('hello-world-test')
    })

    it('should handle underscores', () => {
      expect(generateSlug('hello_world_test')).toBe('hello-world-test')
    })

    it('should handle HTML tags', () => {
      expect(generateSlug('<h1>Hello World</h1>')).toBe('hello-world')
    })

    it('should limit length to 100 characters', () => {
      const longText = 'a'.repeat(200)
      expect(generateSlug(longText).length).toBeLessThanOrEqual(100)
    })

    it('should handle consecutive hyphens', () => {
      expect(generateSlug('Hello---World')).toBe('hello-world')
    })
  })

  describe('with Arabic text', () => {
    it('should transliterate Arabic characters', () => {
      const slug = generateSlug('مرحبا بالعالم')
      // Should be URL-safe and contain no spaces
      expect(slug).toMatch(/^[a-z-]+$/)
      expect(slug).not.toContain(' ')
    })

    it('should handle mixed Arabic and English', () => {
      const slug = generateSlug('Hello مرحبا')
      expect(slug).toMatch(/hello/)
      expect(slug).not.toContain(' ')
    })

    it('should handle common Arabic words', () => {
      expect(generateSlug('المقال')).not.toContain('ا')
      expect(generateSlug('صحافة')).not.toContain('ص')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const slug = generateSlug('')
      expect(slug).toMatch(/^post-\d+$/)
    })

    it('should handle special characters only', () => {
      const slug = generateSlug('!!!$$$%%%')
      expect(slug).toMatch(/^post-\d+$/)
    })

    it('should handle numbers', () => {
      expect(generateSlug('123 Test 456')).toBe('123-test-456')
    })

    it('should handle consecutive hyphens', () => {
      expect(generateSlug('Hello---World')).toBe('hello-world')
    })
  })

  describe('URL safety', () => {
    it('should not produce empty segments', () => {
      const slug = generateSlug('test')
      expect(slug).not.toContain('--')
    })

    it('should be URL-safe', () => {
      const slug = generateSlug('Test Article 123')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })
  })
})
