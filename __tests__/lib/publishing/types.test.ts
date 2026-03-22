import { isValidScheduledDate, ARABIC_TIMEZONES } from '@/lib/publishing/types'

describe('isValidScheduledDate', () => {
  describe('past and immediate dates', () => {
    it('should reject a date in the past', () => {
      const past = new Date(Date.now() - 60_000) // 1 minute ago
      expect(isValidScheduledDate(past)).toBe(false)
    })

    it('should reject the current time', () => {
      expect(isValidScheduledDate(new Date())).toBe(false)
    })

    it('should reject a date only 1 minute in the future (less than 5 min minimum)', () => {
      const tooSoon = new Date(Date.now() + 60_000) // 1 minute from now
      expect(isValidScheduledDate(tooSoon)).toBe(false)
    })

    it('should reject a date exactly 4 minutes 59 seconds in the future', () => {
      const justUnder5Min = new Date(Date.now() + 4 * 60_000 + 59_000)
      expect(isValidScheduledDate(justUnder5Min)).toBe(false)
    })
  })

  describe('valid scheduling window', () => {
    it('should accept a date 6 minutes in the future', () => {
      const valid = new Date(Date.now() + 6 * 60_000)
      expect(isValidScheduledDate(valid)).toBe(true)
    })

    it('should accept a date 1 hour in the future', () => {
      const valid = new Date(Date.now() + 60 * 60_000)
      expect(isValidScheduledDate(valid)).toBe(true)
    })

    it('should accept a date 1 week in the future', () => {
      const valid = new Date(Date.now() + 7 * 24 * 60 * 60_000)
      expect(isValidScheduledDate(valid)).toBe(true)
    })

    it('should accept a date 6 months in the future', () => {
      const valid = new Date(Date.now() + 180 * 24 * 60 * 60_000)
      expect(isValidScheduledDate(valid)).toBe(true)
    })
  })

  describe('dates exceeding the 1-year maximum', () => {
    it('should reject a date more than 1 year in the future', () => {
      const tooFar = new Date(Date.now() + 366 * 24 * 60 * 60_000)
      expect(isValidScheduledDate(tooFar)).toBe(false)
    })

    it('should reject a date 2 years in the future', () => {
      const twoYears = new Date(Date.now() + 730 * 24 * 60 * 60_000)
      expect(isValidScheduledDate(twoYears)).toBe(false)
    })
  })
})

describe('ARABIC_TIMEZONES', () => {
  it('should contain Riyadh timezone', () => {
    const riyadh = ARABIC_TIMEZONES.find((tz) => tz.value === 'Asia/Riyadh')
    expect(riyadh).toBeDefined()
  })

  it('should contain valid IANA timezone identifiers', () => {
    for (const tz of ARABIC_TIMEZONES) {
      expect(tz.value).toMatch(/^(Asia|Africa)\//)
      expect(tz.label).toBeTruthy()
    }
  })

  it('should have at least 10 timezones for Arabic regions', () => {
    expect(ARABIC_TIMEZONES.length).toBeGreaterThanOrEqual(10)
  })
})
