/**
 * Nano Banana AI Image Generation Service
 *
 * Nano Banana provides AI image generation via API
 * Website: https://nanobanana.com/
 * Documentation: Available upon account creation
 *
 * Note: This is a third-party service that requires an API key
 */

import { uploadToCloudinary, type UploadApiResponse } from './cloudinary';

// ============================================
// Types
// ============================================

export type NanoBananaModel =
  | 'flux-realism'
  | 'flux-pro'
  | 'flux-anime'
  | 'flux-4o'
  | 'sdxl-turbo'
  | 'stable-diffusion-xl';

export interface NanoBananaGenerateOptions {
  prompt: string;
  model?: NanoBananaModel;
  width?: number;
  height?: number;
  num_images?: number;
  seed?: number;
  negative_prompt?: string;
  guidance_scale?: number;
  num_inference_steps?: number;
}

export interface NanoBananaImageResult {
  url: string;
  seed: number;
  width: number;
  height: number;
  model: NanoBananaModel;
}

export interface NanoBananaResponse {
  success: boolean;
  images?: Array<{
    url: string;
    seed: number;
  }>;
  error?: string;
}

// ============================================
// Configuration
// ============================================

const API_BASE_URL = 'https://api.nanobanana.com/v1'; // Update with actual API URL

const DEFAULT_MODEL: NanoBananaModel = 'flux-realism';

// Default dimensions for different aspect ratios
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1024, height: 768 },
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 768, height: 1024 },
  '9:16': { width: 720, height: 1280 },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get dimensions for an aspect ratio
 */
export function getDimensionsForAspectRatio(
  aspectRatio: string,
  width?: number,
  height?: number
): { width: number; height: number } {
  if (width && height) {
    return { width, height };
  }
  return ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['16:9'];
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ============================================
// API Functions
// ============================================

/**
 * Generate images using Nano Banana API
 */
export async function generateNanoBananaImages(
  options: NanoBananaGenerateOptions
): Promise<NanoBananaImageResult[]> {
  const apiKey = process.env.NANO_BANANA_API_KEY;

  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY is not configured in environment variables');
  }

  const {
    prompt,
    model = DEFAULT_MODEL,
    width = 1280,
    height = 720,
    num_images = 1,
    seed,
    negative_prompt = '',
    guidance_scale = 7.5,
    num_inference_steps = 30,
  } = options;

  try {
    const response = await fetch(`${API_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model,
        width,
        height,
        num_images,
        seed: seed || generateSeed(),
        negative_prompt,
        guidance_scale,
        num_inference_steps,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Nano Banana API error: ${response.status}`);
    }

    const data: NanoBananaResponse = await response.json();

    if (!data.success || !data.images) {
      throw new Error(data.error || 'Failed to generate images');
    }

    return data.images.map((img) => ({
      url: img.url,
      seed: img.seed,
      width,
      height,
      model,
    }));
  } catch (error) {
    console.error('Nano Banana generation error:', error);
    throw error;
  }
}

/**
 * Generate a single image
 */
export async function generateNanoBananaImage(
  options: NanoBananaGenerateOptions
): Promise<NanoBananaImageResult> {
  const results = await generateNanoBananaImages({ ...options, num_images: 1 });
  return results[0];
}

/**
 * Generate image with aspect ratio
 */
export async function generateNanoBananaImageWithAspectRatio(
  prompt: string,
  aspectRatio: string = '16:9',
  options?: Partial<Omit<NanoBananaGenerateOptions, 'prompt' | 'width' | 'height'>>
): Promise<NanoBananaImageResult> {
  const dimensions = getDimensionsForAspectRatio(aspectRatio);

  return generateNanoBananaImage({
    prompt,
    width: dimensions.width,
    height: dimensions.height,
    ...options,
  });
}

/**
 * Fetch image and save to Cloudinary
 */
export async function saveNanoBananaImageToCloudinary(
  imageUrl: string,
  filename?: string
): Promise<{ cloudinaryUrl: string; publicId: string; uploadResult: UploadApiResponse }> {
  // Fetch the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const finalFilename = filename || `nano-banana-${Date.now()}.jpg`;

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(buffer, finalFilename);

  return {
    cloudinaryUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    uploadResult,
  };
}

/**
 * Generate and save to Cloudinary
 */
export async function generateNanoBananaImageSaved(
  options: NanoBananaGenerateOptions,
  filename?: string
): Promise<NanoBananaImageResult & { cloudinaryUrl?: string; publicId?: string }> {
  const result = await generateNanoBananaImage(options);

  // Check if Cloudinary is configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const { cloudinaryUrl, publicId } = await saveNanoBananaImageToCloudinary(
        result.url,
        filename
      );
      return {
        ...result,
        cloudinaryUrl,
        publicId,
      };
    } catch (error) {
      console.warn('Failed to save to Cloudinary, returning direct URL:', error);
    }
  }

  return result;
}

// ============================================
// Validation
// ============================================

/**
 * Check if Nano Banana is configured
 */
export function isNanoBananaConfigured(): boolean {
  return !!process.env.NANO_BANANA_API_KEY;
}

/**
 * Validate prompt for Nano Banana
 */
export interface PromptValidation {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

export function validatePrompt(prompt: string): PromptValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!prompt || prompt.trim().length === 0) {
    issues.push('الوصف فارغ');
    return { valid: false, issues, suggestions };
  }

  if (prompt.length < 10) {
    issues.push('الوصف قصير جداً');
    suggestions.push('أضف المزيد من التفاصيل للحصول على نتيجة أفضل');
  }

  if (prompt.length > 1000) {
    issues.push('الوصف طويل جداً');
    suggestions.push('قلل الوصف إلى 500 كلمة كحد أقصى');
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

export class NanoBananaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'NanoBananaError';
  }
}

/**
 * Safe wrapper for image generation
 */
export async function safeGenerateNanoBananaImage(
  options: NanoBananaGenerateOptions
): Promise<{ success: boolean; data?: NanoBananaImageResult; error?: string }> {
  try {
    if (!isNanoBananaConfigured()) {
      return {
        success: false,
        error: 'خدمة Nano Banana غير متاحة. يرجى تكوين NANO_BANANA_API_KEY',
      };
    }

    const validation = validatePrompt(options.prompt);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.issues.join(', '),
      };
    }

    const result = await generateNanoBananaImage(options);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل توليد الصورة',
    };
  }
}

export default {
  generateNanoBananaImages,
  generateNanoBananaImage,
  generateNanoBananaImageWithAspectRatio,
  saveNanoBananaImageToCloudinary,
  generateNanoBananaImageSaved,
  isNanoBananaConfigured,
  validatePrompt,
  safeGenerateNanoBananaImage,
  generateSeed,
  getDimensionsForAspectRatio,
};
