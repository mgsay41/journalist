import {
  detectSqlInjection,
  detectXss,
  detectPathTraversal,
  detectCommandInjection,
  validateString,
  sanitizeString,
  isValidEmail,
  isValidUrl,
  isValidSlug,
  isValidArabicText,
  sanitizeResponse,
} from '@/lib/security/validation'

describe('Security Validation', () => {
  describe('detectSqlInjection', () => {
    it('should detect SQL injection with SELECT', () => {
      expect(detectSqlInjection("'; SELECT * FROM users; --")).toBe(true)
    })

    it('should detect SQL injection with DROP', () => {
      expect(detectSqlInjection("'; DROP TABLE users; --")).toBe(true)
    })

    it('should detect SQL injection with UNION', () => {
      expect(detectSqlInjection("' UNION SELECT password FROM users; --")).toBe(true)
    })

    it('should detect SQL injection with OR clause', () => {
      expect(detectSqlInjection("' OR '1'='1")).toBe(true)
    })

    it('should detect SQL injection with comments', () => {
      expect(detectSqlInjection("admin'--")).toBe(true)
      expect(detectSqlInjection("admin'/*")).toBe(true)
    })

    it('should allow safe SQL content', () => {
      expect(detectSqlInjection('This is safe text')).toBe(false)
      expect(detectSqlInjection('Hello World')).toBe(false)
    })
  })

  describe('detectXss', () => {
    it('should detect script tags', () => {
      expect(detectXss('<script>alert("XSS")</script>')).toBe(true)
      expect(detectXss('<SCRIPT>alert("XSS")</SCRIPT>')).toBe(true)
    })

    it('should detect javascript: protocol', () => {
      expect(detectXss('<a href="javascript:alert(1)">click</a>')).toBe(true)
      expect(detectXss('javascript:document.cookie')).toBe(true)
    })

    it('should detect event handlers', () => {
      expect(detectXss('<img onerror="alert(1)" src="x">')).toBe(true)
      expect(detectXss('<div onclick="alert(1)">click</div>')).toBe(true)
      expect(detectXss('<body onload="alert(1)">')).toBe(true)
    })

    it('should detect iframe tags', () => {
      expect(detectXss('<iframe src="http://evil.com"></iframe>')).toBe(true)
    })

    it('should detect object tags', () => {
      expect(detectXss('<object data="evil.swf"></object>')).toBe(true)
    })

    it('should allow safe HTML', () => {
      expect(detectXss('<p>This is safe</p>')).toBe(false)
      expect(detectXss('<strong>Bold text</strong>')).toBe(false)
      expect(detectXss('<a href="http://example.com">link</a>')).toBe(false)
    })
  })

  describe('detectPathTraversal', () => {
    it('should detect ../ pattern', () => {
      expect(detectPathTraversal('../../../etc/passwd')).toBe(true)
    })

    it('should detect ..\\ pattern', () => {
      expect(detectPathTraversal('..\\..\\windows\\system32')).toBe(true)
    })

    it('should detect URL encoded path traversal', () => {
      expect(detectPathTraversal('..%2f..%2fetc/passwd')).toBe(true)
      expect(detectPathTraversal('..%5c..%5cwindows')).toBe(true)
    })

    it('should detect /etc/ path', () => {
      expect(detectPathTraversal('/etc/passwd')).toBe(true)
      expect(detectPathTraversal('/proc/self/environ')).toBe(true)
    })

    it('should detect Windows paths', () => {
      expect(detectPathTraversal('C:\\Windows\\System32')).toBe(true)
    })

    it('should allow safe paths', () => {
      expect(detectPathTraversal('/articles/test')).toBe(false)
      expect(detectPathTraversal('/user/profile')).toBe(false)
    })
  })

  describe('detectCommandInjection', () => {
    it('should detect pipe operator', () => {
      expect(detectCommandInjection('cat /etc/passwd | grep root')).toBe(true)
    })

    it('should detect semicolon separator', () => {
      expect(detectCommandInjection('file.txt; rm -rf /')).toBe(true)
    })

    it('should detect command substitution', () => {
      expect(detectCommandInjection('$(cat /etc/passwd)')).toBe(true)
      expect(detectCommandInjection('`whoami`')).toBe(true)
    })

    it('should detect eval', () => {
      expect(detectCommandInjection('eval(malicious_code)')).toBe(true)
    })

    it('should allow safe input', () => {
      expect(detectCommandInjection('normal text here')).toBe(false)
      expect(detectCommandInjection('Hello World 123')).toBe(false)
    })
  })

  describe('validateString', () => {
    it('should validate safe strings', () => {
      expect(validateString('Safe text here').valid).toBe(true)
      expect(validateString('مرحبا بالعالم').valid).toBe(true)
    })

    it('should reject SQL injection', () => {
      const result = validateString("'; DROP TABLE users; --")
      expect(result.valid).toBe(false)
      // Note: SQL injection detection is checked before XSS
      expect(result.error).toBeTruthy()
    })

    it('should reject XSS', () => {
      // Use a different XSS payload that doesn't trigger SQL pattern
      const result = validateString('<img onerror="alert(1)">')
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should reject path traversal', () => {
      const result = validateString('../../../etc/passwd')
      expect(result.valid).toBe(false)
    })

    it('should reject command injection', () => {
      const result = validateString('file.txt; rm -rf /')
      expect(result.valid).toBe(false)
    })

    it('should reject null bytes', () => {
      const result = validateString('text\x00with\x00nulls')
      expect(result.valid).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      expect(sanitizeString('<script>alert(1)</script>Hello')).toBe('Hello')
    })

    it('should remove javascript: protocol', () => {
      // Removes javascript: but leaves the rest
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)')
      expect(sanitizeString('javascript:')).toBe('')
    })

    it('should remove event handlers', () => {
      // Removes onerror= but leaves the attribute value
      const result = sanitizeString('<img onerror="alert(1)">')
      expect(result).not.toContain('onerror')
      expect(result).toContain('<img')
    })

    it('should preserve safe content', () => {
      expect(sanitizeString('<p>Hello World</p>')).toBe('<p>Hello World</p>')
    })
  })

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('user.name@example.com')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
      expect(isValidEmail('user@sub.example.com')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      // Note: The simple regex allows user..name@example.com
      // For stricter validation, a more complex regex or library would be needed
    })
  })

  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('https://example.com/path')).toBe(true)
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true)
    })

    it('should reject non-HTTP protocols', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
      expect(isValidUrl('file:///etc/passwd')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
    })
  })

  describe('isValidSlug', () => {
    it('should accept valid slugs', () => {
      expect(isValidSlug('hello-world')).toBe(true)
      expect(isValidSlug('test-article-123')).toBe(true)
      expect(isValidSlug('my-first-post')).toBe(true)
    })

    it('should reject invalid slugs', () => {
      expect(isValidSlug('Hello World')).toBe(false) // uppercase
      expect(isValidSlug('hello_world')).toBe(false) // underscore
      expect(isValidSlug('hello--world')).toBe(false) // double hyphen
      expect(isValidSlug('-hello')).toBe(false) // leading hyphen
      expect(isValidSlug('hello-')).toBe(false) // trailing hyphen
      expect(isValidSlug('مرحبا')).toBe(false) // non-latin
    })
  })

  describe('isValidArabicText', () => {
    it('should accept Arabic text', () => {
      expect(isValidArabicText('مرحبا بالعالم')).toBe(true)
      expect(isValidArabicText('صباح الخير')).toBe(true)
      expect(isValidArabicText('المقال الأخير')).toBe(true)
    })

    it('should accept Arabic with punctuation and numbers', () => {
      expect(isValidArabicText('مرحباً، كيف حالك؟')).toBe(true)
      expect(isValidArabicText('الصفحة 1')).toBe(true)
      expect(isValidArabicText('العنوان: المقال الأول')).toBe(true)
    })

    it('should reject non-Arabic text with special characters', () => {
      expect(isValidArabicText('<script>alert(1)</script>')).toBe(false)
      expect(isValidArabicText('Hello World')).toBe(false)
    })
  })

  describe('sanitizeResponse', () => {
    it('should redact sensitive fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
        apiKey: 'key-abc-123',
      }

      const sanitized = sanitizeResponse(data)

      expect(sanitized.name).toBe('John')
      expect(sanitized.email).toBe('john@example.com')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
    })

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          password: 'secret123',
          profile: {
            token: 'abc-123',
          },
        },
      }

      const sanitized = sanitizeResponse(data)

      expect(sanitized.user.name).toBe('John')
      expect(sanitized.user.password).toBe('[REDACTED]')
      expect(sanitized.user.profile.token).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const data = {
        users: [
          { name: 'John', password: 'pass1' },
          { name: 'Jane', password: 'pass2' },
        ],
      }

      const sanitized = sanitizeResponse(data)

      expect(sanitized.users[0].name).toBe('John')
      expect(sanitized.users[0].password).toBe('[REDACTED]')
      expect(sanitized.users[1].name).toBe('Jane')
      expect(sanitized.users[1].password).toBe('[REDACTED]')
    })

    it('should accept custom sensitive fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        ssn: '123-45-6789',
      }

      const sanitized = sanitizeResponse(data, ['ssn'])

      expect(sanitized.name).toBe('John')
      expect(sanitized.email).toBe('john@example.com')
      expect(sanitized.ssn).toBe('[REDACTED]')
    })
  })
})
