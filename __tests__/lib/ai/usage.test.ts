// Mock @google/genai (ESM-only package not compatible with Jest's CommonJS transform)
jest.mock('@google/genai', () => ({}))
// Mock @upstash/redis
jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }))

import { calculateCost } from '@/lib/ai/usage'

describe('calculateCost', () => {
  describe('gemini-2.5-flash', () => {
    it('should calculate input cost correctly', () => {
      // 1M input tokens at $0.15/M = $0.15
      const result = calculateCost('gemini-2.5-flash', 1_000_000, 0)
      expect(result.inputCost).toBeCloseTo(0.15, 6)
      expect(result.outputCost).toBe(0)
      expect(result.totalCost).toBeCloseTo(0.15, 6)
    })

    it('should calculate output cost correctly', () => {
      // 1M output tokens at $0.60/M = $0.60
      const result = calculateCost('gemini-2.5-flash', 0, 1_000_000)
      expect(result.inputCost).toBe(0)
      expect(result.outputCost).toBeCloseTo(0.60, 6)
      expect(result.totalCost).toBeCloseTo(0.60, 6)
    })

    it('should calculate combined cost for typical usage', () => {
      // 1000 input + 500 output tokens
      const result = calculateCost('gemini-2.5-flash', 1000, 500)
      const expectedInput = (1000 / 1_000_000) * 0.15
      const expectedOutput = (500 / 1_000_000) * 0.60
      expect(result.inputCost).toBeCloseTo(expectedInput, 6)
      expect(result.outputCost).toBeCloseTo(expectedOutput, 6)
      expect(result.totalCost).toBeCloseTo(expectedInput + expectedOutput, 6)
    })
  })

  describe('gemini-2.0-flash', () => {
    it('should calculate cost at $0.10/$0.40 per 1M tokens', () => {
      const result = calculateCost('gemini-2.0-flash', 1_000_000, 1_000_000)
      expect(result.inputCost).toBeCloseTo(0.10, 6)
      expect(result.outputCost).toBeCloseTo(0.40, 6)
      expect(result.totalCost).toBeCloseTo(0.50, 6)
    })
  })

  describe('gemini-1.5-flash', () => {
    it('should calculate cost at $0.075/$0.30 per 1M tokens', () => {
      const result = calculateCost('gemini-1.5-flash', 1_000_000, 1_000_000)
      expect(result.inputCost).toBeCloseTo(0.075, 6)
      expect(result.outputCost).toBeCloseTo(0.30, 6)
      expect(result.totalCost).toBeCloseTo(0.375, 6)
    })
  })

  describe('gemini-1.5-pro', () => {
    it('should calculate cost at $1.25/$5.00 per 1M tokens', () => {
      const result = calculateCost('gemini-1.5-pro', 1_000_000, 1_000_000)
      expect(result.inputCost).toBeCloseTo(1.25, 6)
      expect(result.outputCost).toBeCloseTo(5.00, 6)
      expect(result.totalCost).toBeCloseTo(6.25, 6)
    })
  })

  describe('unknown model', () => {
    it('should return zero cost for unknown model', () => {
      const result = calculateCost('unknown-model' as any, 1000, 500)
      expect(result.inputCost).toBe(0)
      expect(result.outputCost).toBe(0)
      expect(result.totalCost).toBe(0)
    })
  })

  describe('zero tokens', () => {
    it('should return zero cost when both token counts are zero', () => {
      const result = calculateCost('gemini-2.5-flash', 0, 0)
      expect(result.inputCost).toBe(0)
      expect(result.outputCost).toBe(0)
      expect(result.totalCost).toBe(0)
    })
  })

  describe('cost precision', () => {
    it('should round to 6 decimal places', () => {
      // Small token count to test precision
      const result = calculateCost('gemini-2.5-flash', 100, 50)
      // 100/1M * 0.15 = 0.000015
      expect(result.inputCost).toBe(0.000015)
      // 50/1M * 0.60 = 0.00003
      expect(result.outputCost).toBe(0.00003)
    })

    it('should have totalCost equal to inputCost + outputCost', () => {
      const result = calculateCost('gemini-1.5-pro', 5000, 2000)
      expect(result.totalCost).toBeCloseTo(result.inputCost + result.outputCost, 6)
    })
  })
})
