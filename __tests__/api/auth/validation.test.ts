/**
 * Auth Flow Validation Tests
 *
 * Tests the pure validation logic used in the login and signup routes:
 * - Password strength validation (validatePasswordStrength)
 * - Email format validation (isValidEmail)
 */

import { validatePasswordStrength } from '@/lib/security/sanitization'
import { isValidEmail } from '@/lib/security/validation'

describe('validatePasswordStrength', () => {
  describe('weak passwords', () => {
    it('should mark a short password as weak', () => {
      const result = validatePasswordStrength('abc')
      expect(result.strength).toBe('weak')
      expect(result.feedback).toContain('يجب أن تكون كلمة المرور 8 أحرف على الأقل')
    })

    it('should mark a numeric-only password as weak', () => {
      const result = validatePasswordStrength('123456')
      expect(result.strength).toBe('weak')
    })

    it('should mark a 6-character password as weak (below 8-char minimum)', () => {
      const result = validatePasswordStrength('abc123')
      expect(result.strength).toBe('weak')
      expect(result.feedback.some(f => f.includes('8'))).toBe(true)
    })
  })

  describe('medium passwords', () => {
    it('should mark a password with letters and numbers as medium', () => {
      const result = validatePasswordStrength('Password1')
      expect(result.strength).toBe('medium')
    })

    it('should have a score between 3 and 4 for medium strength', () => {
      const result = validatePasswordStrength('Password1')
      expect(result.score).toBeGreaterThanOrEqual(3)
      expect(result.score).toBeLessThanOrEqual(4)
    })
  })

  describe('strong passwords', () => {
    it('should mark a complex password as strong', () => {
      const result = validatePasswordStrength('MyStr0ng!Pass')
      expect(result.strength).toBe('strong')
      expect(result.score).toBeGreaterThanOrEqual(5)
    })

    it('should give high score to a long complex password', () => {
      const result = validatePasswordStrength('SuperSecure@Password123!')
      expect(result.strength).toBe('strong')
      expect(result.score).toBeGreaterThanOrEqual(6)
    })

    it('should return empty feedback for a strong password', () => {
      const result = validatePasswordStrength('MyStr0ng!Pass')
      expect(result.feedback).toHaveLength(0)
    })
  })

  describe('scoring', () => {
    it('should not add feedback for lowercase when password has lowercase', () => {
      const withLower = validatePasswordStrength('abcdefgh')
      expect(withLower.feedback).not.toContain('أضف أحرفاً صغيرة')
    })

    it('should add feedback for missing lowercase', () => {
      const withoutLower = validatePasswordStrength('12345678')
      expect(withoutLower.feedback).toContain('أضف أحرفاً صغيرة')
    })

    it('should add score for uppercase letters', () => {
      const result = validatePasswordStrength('ABCDEFGH1')
      expect(result.feedback).not.toContain('أضف أحرفاً كبيرة')
    })

    it('should add score for special characters', () => {
      const withSpecial = validatePasswordStrength('Password1!')
      const withoutSpecial = validatePasswordStrength('Password1a')
      expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score)
    })
  })
})

describe('isValidEmail (auth context)', () => {
  describe('valid email formats', () => {
    it('should accept standard email', () => {
      expect(isValidEmail('admin@example.com')).toBe(true)
    })

    it('should accept email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('should accept email with plus sign', () => {
      expect(isValidEmail('admin+test@example.com')).toBe(true)
    })
  })

  describe('invalid email formats', () => {
    it('should reject email without @ symbol', () => {
      expect(isValidEmail('adminexample.com')).toBe(false)
    })

    it('should reject email without domain', () => {
      expect(isValidEmail('admin@')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })

    it('should reject plain text', () => {
      expect(isValidEmail('not-an-email')).toBe(false)
    })

    it('should reject email starting with @', () => {
      expect(isValidEmail('@example.com')).toBe(false)
    })
  })
})
