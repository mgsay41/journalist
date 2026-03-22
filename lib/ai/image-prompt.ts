/**
 * AI Image Prompt Generation Service
 *
 * Generates detailed prompts for AI image generation based on article content
 */

import {
  generateContent,
  GeminiError,
  type GenerateOptions,
  type GeminiModelId,
} from "../gemini";
import {
  buildImagePromptGeneration,
  buildImagePromptEnhancement,
  buildImagePromptVariations,
} from "./prompts";

// Default model for image prompt generation
const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

// Default options
const DEFAULT_OPTIONS: GenerateOptions = {
  model: DEFAULT_MODEL,
  temperature: 0.8, // Higher temperature for more creative prompts
  useCache: true,
  systemInstruction: `أنت مساعد ذكاء اصطناعي متخصص في إنشاء أوصاف الصور المفصلة والمحترفة.
- اكتب أوصافاً دقيقة وقوية لتوليد صور عالية الجودة
- ركز على التفاصيل البصرية الواضحة
- استخدم كلمات مفتاحية محترفة في التصوير والفن
- الأوصاف الإنجليزية يجب أن تكون جاهزة مباشرة للاستخدام مع مولّدات الصور
- قدم دائماً JSON صالح ومكتمل`,
};

// Token usage info
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: GeminiModelId;
  cached: boolean;
}

// Result wrapper with usage tracking
export interface AiResultWithUsage<T> {
  data: T;
  usage: TokenUsage;
}

// ============================================
// Types
// ============================================

export interface VisualElement {
  element: string;
  description: string;
}

export interface GeneratedImagePrompt {
  englishPrompt: string;
  arabicDescription: string;
  visualElements: string[];
  colorPalette: string[];
  styleKeywords: string[];
  compositionHint: string;
  mood: string;
}

export interface ImagePromptResult {
  prompt: GeneratedImagePrompt;
  usage: TokenUsage;
}

export interface EnhancedImagePrompt {
  enhancedEnglishPrompt: string;
  arabicDescription: string;
  changes: string[];
  qualityKeywords: string[];
}

export interface PromptVariation {
  id: string;
  englishPrompt: string;
  arabicDescription: string;
  style: "photorealistic" | "illustration" | "digital-art" | "mixed-media";
  mood: "dramatic" | "uplifting" | "calm" | "inspiring" | "professional";
  focusArea: "person" | "object" | "concept" | "scene" | "abstract";
  recommendedFor: string;
}

export interface ImagePromptVariationsResult {
  variations: PromptVariation[];
}

// ============================================
// Helper Functions
// ============================================

function parseJsonResponse<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code block wrapper if present
  if (jsonStr.startsWith("```")) {
    const firstNewline = jsonStr.indexOf("\n");
    if (firstNewline !== -1) {
      jsonStr = jsonStr.substring(firstNewline + 1);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3).trim();
    }
  }

  // Try to parse directly
  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    // Try to find and extract just the JSON object
    const objectStart = jsonStr.indexOf("{");
    const objectEnd = jsonStr.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      const extracted = jsonStr.substring(objectStart, objectEnd + 1);
      try {
        return JSON.parse(extracted);
      } catch {
        // Try fixing common issues
        const fixed = extracted
          .replace(/,(\s*[}\]])/g, "$1")
          .replace(/\n/g, " ");
        try {
          return JSON.parse(fixed);
        } catch {
          // Continue to error
        }
      }
    }

    console.error("=== AI Response Parse Error ===");
    console.error("Original length:", text.length);
    console.error("Cleaned jsonStr:", jsonStr.substring(0, 1500));
    console.error("Parse error:", parseError);
    throw new GeminiError(
      "فشل في تحليل استجابة JSON من النموذج",
      "INVALID_RESPONSE"
    );
  }
}

function extractUsage(
  result: {
    tokensUsed?: { input: number; output: number };
    cached: boolean;
    model: string;
  },
  model: GeminiModelId
): TokenUsage {
  return {
    inputTokens: result.tokensUsed?.input || 0,
    outputTokens: result.tokensUsed?.output || 0,
    model,
    cached: result.cached,
  };
}

// ============================================
// Main Functions
// ============================================

/**
 * Generate an image prompt for a featured image
 */
export async function generateImagePrompt(data: {
  title: string;
  content: string;
  category?: string;
  style?: "professional" | "casual" | "artistic" | "minimalist" | "editorial";
  aspectRatio?: "16:9" | "4:3" | "1:1";
}): Promise<AiResultWithUsage<GeneratedImagePrompt>> {
  const prompt = buildImagePromptGeneration(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 4096,
  });

  return {
    data: parseJsonResponse<GeneratedImagePrompt>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

/**
 * Enhance an existing image prompt
 */
export async function enhanceImagePrompt(data: {
  basePrompt: string;
  articleContext: string;
  improvements?: string[];
}): Promise<AiResultWithUsage<EnhancedImagePrompt>> {
  const prompt = buildImagePromptEnhancement(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 4096,
    temperature: 0.7,
  });

  return {
    data: parseJsonResponse<EnhancedImagePrompt>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

/**
 * Generate multiple prompt variations
 */
export async function generatePromptVariations(data: {
  title: string;
  content: string;
  category?: string;
  count?: number;
}): Promise<AiResultWithUsage<ImagePromptVariationsResult>> {
  const prompt = buildImagePromptVariations(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    temperature: 0.9, // Higher temperature for more diverse variations
  });

  return {
    data: parseJsonResponse<ImagePromptVariationsResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Error Handling Wrapper
// ============================================

export interface AiResult<T> {
  success: boolean;
  data?: T;
  usage?: TokenUsage;
  error?: {
    code: string;
    message: string;
  };
}

export async function safeAiCall<T>(
  fn: () => Promise<AiResultWithUsage<T>>
): Promise<AiResult<T>> {
  try {
    const result = await fn();
    return { success: true, data: result.data, usage: result.usage };
  } catch (error) {
    if (error instanceof GeminiError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "خطأ غير معروف",
      },
    };
  }
}
