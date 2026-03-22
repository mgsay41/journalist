/**
 * Google Gemini AI Client Configuration
 *
 * Uses Gemini 2.0 Flash as default - best balance of performance and cost
 * - Free tier available for development
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

// Available Gemini models
export const GEMINI_MODELS = {
  // Recommended - Gemini 2.5 Flash
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    inputCost: 0.15, // per 1M tokens
    outputCost: 0.60,
    maxTokens: 8192,
    contextWindow: 1000000,
    description: "Latest 2.5 flash model with enhanced capabilities",
  },
  // Stable 2.0 Flash
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    inputCost: 0.10,
    outputCost: 0.40,
    maxTokens: 8192,
    contextWindow: 1000000,
    description: "Stable and fast flash model",
  },
  // Flash 1.5
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    inputCost: 0.075,
    outputCost: 0.30,
    maxTokens: 8192,
    contextWindow: 1000000,
    description: "Fast and efficient flash model",
  },
  // Pro model for complex tasks
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    inputCost: 1.25,
    outputCost: 5.00,
    maxTokens: 8192,
    contextWindow: 2000000,
    description: "Advanced model for complex reasoning",
  },
} as const;

export type GeminiModelId = keyof typeof GEMINI_MODELS;

// Default model
const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerMinute: 60, // Conservative limit
  maxRequestsPerDay: 1000, // Free tier limit
};

// Simple in-memory rate limiter
class RateLimiter {
  private requests: number[] = [];
  private dailyCount = 0;
  private lastDayReset = Date.now();

  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000;

    // Reset daily counter if needed
    if (now - this.lastDayReset > 86400000) {
      this.dailyCount = 0;
      this.lastDayReset = now;
    }

    // Remove old requests from minute window
    this.requests = this.requests.filter((time) => time > oneMinuteAgo);

    // Check limits
    if (this.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
      return false;
    }
    if (this.dailyCount >= RATE_LIMIT.maxRequestsPerDay) {
      return false;
    }

    return true;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
    this.dailyCount++;
  }

  getStatus(): { minuteRemaining: number; dailyRemaining: number } {
    return {
      minuteRemaining: RATE_LIMIT.maxRequestsPerMinute - this.requests.length,
      dailyRemaining: RATE_LIMIT.maxRequestsPerDay - this.dailyCount,
    };
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis client for Gemini response cache — lazy init
// ---------------------------------------------------------------------------
let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

// Response cache with TTL — uses Redis in production, in-memory in dev
interface CacheEntry {
  response: string;
  timestamp: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl: number;
  private readonly ttlSeconds: number;

  constructor(ttlHours = 24) {
    this.ttl = ttlHours * 60 * 60 * 1000;
    this.ttlSeconds = ttlHours * 60 * 60;
  }

  private generateKey(prompt: string, model: string): string {
    let hash = 0;
    const str = `${model}:${prompt}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async get(prompt: string, model: string): Promise<string | null> {
    const key = `gemini:cache:${this.generateKey(prompt, model)}`;
    const redis = getRedis();

    if (redis) {
      return await redis.get<string>(key);
    }

    // In-memory fallback
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  async set(prompt: string, model: string, response: string): Promise<void> {
    const key = `gemini:cache:${this.generateKey(prompt, model)}`;
    const redis = getRedis();

    if (redis) {
      await redis.set(key, response, { ex: this.ttlSeconds });
      return;
    }

    // In-memory fallback
    this.cache.set(key, { response, timestamp: Date.now() });
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton instances
const rateLimiter = new RateLimiter();
const responseCache = new ResponseCache(24); // 24 hour cache

// Initialize Gemini client
let geminiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiError(
        "GEMINI_API_KEY غير مُعرّف. يرجى إضافته في ملف .env",
        "MISSING_API_KEY"
      );
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Custom error class
export class GeminiError extends Error {
  constructor(
    message: string,
    public code:
      | "MISSING_API_KEY"
      | "RATE_LIMITED"
      | "API_ERROR"
      | "INVALID_RESPONSE"
      | "CONTENT_BLOCKED"
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

// Main generation function
export interface GenerateOptions {
  model?: GeminiModelId;
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
  systemInstruction?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  cached: boolean;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export async function generateContent(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = 2048,
    temperature = 0.7,
    useCache = true,
    systemInstruction,
  } = options;

  // Check cache first
  if (useCache) {
    const cached = await responseCache.get(prompt, model);
    if (cached) {
      return {
        text: cached,
        model,
        cached: true,
      };
    }
  }

  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const status = rateLimiter.getStatus();
    throw new GeminiError(
      `تم تجاوز الحد المسموح. المتبقي: ${status.minuteRemaining} طلب/دقيقة، ${status.dailyRemaining} طلب/يوم`,
      "RATE_LIMITED"
    );
  }

  try {
    const client = getClient();

    // Build the request
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(systemInstruction && { systemInstruction }),
      },
    });

    // Record the request
    rateLimiter.recordRequest();

    // Extract text from response
    const text = response.text;
    if (!text) {
      throw new GeminiError(
        "لم يتم الحصول على رد من النموذج",
        "INVALID_RESPONSE"
      );
    }

    // Cache the response
    if (useCache) {
      await responseCache.set(prompt, model, text);
    }

    return {
      text,
      model,
      cached: false,
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }

    // Handle API errors
    const message = error instanceof Error ? error.message : "خطأ غير معروف";

    // Check for content blocked
    if (message.includes("SAFETY") || message.includes("blocked")) {
      throw new GeminiError(
        "تم حظر المحتوى بسبب سياسات الأمان",
        "CONTENT_BLOCKED"
      );
    }

    throw new GeminiError(`خطأ في API: ${message}`, "API_ERROR");
  }
}

// Utility function to get rate limit status
export function getRateLimitStatus() {
  return rateLimiter.getStatus();
}

// Utility function to clear cache
export function clearCache() {
  responseCache.clear();
}

// Utility function to check if API is configured
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Utility function to get model info
export function getModelInfo(modelId: GeminiModelId = DEFAULT_MODEL) {
  return GEMINI_MODELS[modelId];
}
