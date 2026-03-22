/**
 * Pollinations.ai Integration Service
 *
 * Free AI image generation using Pollinations.ai
 * No API key required - uses open-source models
 *
 * Documentation: https://pollinations.ai/
 */

// ============================================
// Types
// ============================================

export type ImageModel =
  | "flux" // Fast, high quality
  | "flux-realism" // Photorealistic
  | "flux-cablyai" // Anime style
  | "flux-anime" // Anime style
  | "turbo"; // Fast generation

export type AspectRatio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

export interface ImageGenerationOptions {
  prompt: string; // English prompt for image generation
  width?: number;
  height?: number;
  seed?: string | number; // For reproducible results
  model?: ImageModel;
  enhance?: boolean; // Whether to use prompt enhancement
  noLogo?: boolean; // Remove watermarks
  private?: boolean; // Make image private (not public in gallery)
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  seed: string;
  model: ImageModel;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  width?: number;
  height?: number;
}

// ============================================
// Configuration
// ============================================

const DEFAULT_MODEL: ImageModel = "flux";
const BASE_URL = "https://image.pollinations.ai/prompt";

// Default dimensions for different aspect ratios
const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1024, height: 768 },
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 720, height: 1280 },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get dimensions for an aspect ratio
 */
export function getDimensionsForAspectRatio(
  aspectRatio: AspectRatio,
  width?: number,
  height?: number
): { width: number; height: number } {
  if (width && height) {
    return { width, height };
  }
  return ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS["16:9"];
}

/**
 * Encode prompt for URL
 */
function encodePrompt(prompt: string): string {
  return encodeURIComponent(prompt.trim());
}

/**
 * Generate a random seed
 */
export function generateSeed(): string {
  return Math.floor(Math.random() * 1000000).toString();
}

/**
 * Build the Pollinations.ai URL
 */
function buildPollinationsUrl(options: ImageGenerationOptions): string {
  const { prompt, width = 1280, height = 720, seed, model, enhance = true, noLogo = true, private: isPrivate = false } = options;

  // Build query parameters
  const params = new URLSearchParams();

  // Add dimensions
  params.set("width", width.toString());
  params.set("height", height.toString());

  // Add seed for reproducibility
  params.set("seed", (seed || generateSeed()).toString());

  // Add model
  params.set("model", model || DEFAULT_MODEL);

  // Add options
  if (enhance) params.set("enhance", "true");
  if (noLogo) params.set("nologo", "true");
  if (isPrivate) params.set("private", "true");

  // Build URL
  // Note: The prompt goes in the path, not as a query param
  const encodedPrompt = encodePrompt(prompt);
  const queryString = params.toString();

  return `${BASE_URL}/${encodedPrompt}${queryString ? `?${queryString}` : ""}`;
}

// ============================================
// Main Functions
// ============================================

/**
 * Generate an image using Pollinations.ai
 * This returns a URL directly - the image is generated on-demand when accessed
 */
export function generateImageUrl(options: ImageGenerationOptions): string {
  return buildPollinationsUrl(options);
}

/**
 * Generate image with full result details
 */
export function generateImage(options: ImageGenerationOptions): GeneratedImage {
  const url = generateImageUrl(options);
  const seed = (options.seed || generateSeed()).toString();
  const { width, height } = getDimensionsForAspectRatio(
    "16:9", // Default aspect ratio if not specified
    options.width,
    options.height
  );

  return {
    url,
    width,
    height,
    seed,
    model: options.model || DEFAULT_MODEL,
  };
}

/**
 * Generate image with aspect ratio
 */
export function generateImageWithAspectRatio(
  prompt: string,
  aspectRatio: AspectRatio = "16:9",
  options?: Partial<Omit<ImageGenerationOptions, "prompt" | "width" | "height">>
): GeneratedImage {
  const dimensions = getDimensionsForAspectRatio(aspectRatio);

  return generateImage({
    prompt,
    width: dimensions.width,
    height: dimensions.height,
    ...options,
  });
}

/**
 * Generate multiple variations of the same prompt
 */
export function generateImageVariations(
  prompt: string,
  count: number = 3,
  options?: Partial<Omit<ImageGenerationOptions, "prompt" | "seed">>
): GeneratedImage[] {
  const variations: GeneratedImage[] = [];

  for (let i = 0; i < count; i++) {
    // Use different seeds for each variation
    const variation = generateImage({
      prompt,
      seed: generateSeed(),
      ...options,
    });
    variations.push(variation);
  }

  return variations;
}

/**
 * Fetch an image as a buffer (for uploading to Cloudinary)
 */
export async function fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Download and save generated image to Cloudinary
 * This requires the cloudinary utility to be configured
 */
export async function downloadToCloudinary(
  options: ImageGenerationOptions,
  filename?: string
): Promise<{ cloudinaryUrl: string; publicId: string; buffer: Buffer }> {
  const { uploadToCloudinary } = await import("./cloudinary");

  // Generate the image URL
  const imageUrl = generateImageUrl(options);

  // Fetch the image
  const buffer = await fetchImageAsBuffer(imageUrl);

  // Generate filename
  const finalFilename = filename || `ai-generated-${Date.now()}.jpg`;

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(buffer, finalFilename);

  return {
    cloudinaryUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    buffer,
  };
}

// ============================================
// Prompt Enhancement
// ============================================

/**
 * Enhance a prompt with quality keywords
 */
export function enhancePrompt(basePrompt: string, style?: "realistic" | "artistic" | "minimalist"): string {
  const qualityKeywords = [
    "high quality",
    "detailed",
    "professional",
    "sharp",
    "well-composed",
  ];

  const styleKeywords: Record<"realistic" | "artistic" | "minimalist", string[]> = {
    realistic: ["photorealistic", "lifelike", "photo", "realistic lighting", "8k"],
    artistic: ["digital art", "artistic", "creative", "vibrant colors", "stylized"],
    minimalist: ["minimalist", "clean", "simple", "elegant", "lots of negative space"],
  };

  let enhancedPrompt = basePrompt.trim();

  // Add style keywords if specified
  if (style && styleKeywords[style]) {
    enhancedPrompt += `, ${styleKeywords[style].join(", ")}`;
  }

  // Add quality keywords
  enhancedPrompt += `, ${qualityKeywords.join(", ")}`;

  return enhancedPrompt;
}

// ============================================
// Validation
// ============================================

/**
 * Validate an image generation prompt
 */
export interface PromptValidation {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

export function validatePrompt(prompt: string): PromptValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check if prompt is empty
  if (!prompt || prompt.trim().length === 0) {
    issues.push("الوصف فارغ");
    return { valid: false, issues, suggestions };
  }

  // Check prompt length
  if (prompt.length < 10) {
    issues.push("الوصف قصير جداً");
    suggestions.push("أضف المزيد من التفاصيل للحصول على نتيجة أفضل");
  }

  // Check for problematic keywords
  const problematicKeywords = ["nsfw", "violent", "gore", "nude"];
  const lowerPrompt = prompt.toLowerCase();
  for (const keyword of problematicKeywords) {
    if (lowerPrompt.includes(keyword)) {
      issues.push(`يحتوي على كلمات غير مناسبة: ${keyword}`);
    }
  }

  // Suggestions for better prompts
  if (!lowerPrompt.includes("light") && !lowerPrompt.includes("lighting")) {
    suggestions.push("أضف وصفاً للإضاءة (مثال: natural lighting, dramatic lighting)");
  }

  if (!lowerPrompt.includes("style") && !lowerPrompt.includes("realistic") && !lowerPrompt.includes("artistic")) {
    suggestions.push("حدد الأسلوب الفني (مثال: photorealistic, illustration)");
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

// ============================================
// Error Handling
// ============================================

export class PollinationsError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "PollinationsError";
  }
}

/**
 * Safe wrapper for image generation
 */
export async function safeGenerateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  try {
    // Validate prompt
    const validation = validatePrompt(options.prompt);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.issues.join(", "),
      };
    }

    // Generate image
    const result = generateImage(options);

    return {
      success: true,
      imageUrl: result.url,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل توليد الصورة",
    };
  }
}

export default {
  generateImageUrl,
  generateImage,
  generateImageWithAspectRatio,
  generateImageVariations,
  fetchImageAsBuffer,
  downloadToCloudinary,
  enhancePrompt,
  validatePrompt,
  safeGenerateImage,
  generateSeed,
  getDimensionsForAspectRatio,
};
