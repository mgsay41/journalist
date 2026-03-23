import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withAuth, withRateLimitMiddleware } from '@/lib/security/middleware';
import {
  generateImage,
  generateImageWithAspectRatio,
  downloadToCloudinary,
  safeGenerateImage,
  enhancePrompt,
  type ImageGenerationOptions,
  type GeneratedImage,
} from '@/lib/pollinations';
import {
  generateNanoBananaImage,
  generateNanoBananaImageWithAspectRatio,
  generateNanoBananaImageSaved,
  safeGenerateNanoBananaImage,
  isNanoBananaConfigured,
  type NanoBananaModel,
} from '@/lib/nanobanana';
import type { ImageModel } from '@/lib/pollinations';

// Rate limiting configuration - stricter for image generation
const RATE_LIMIT = {
  limit: 10, // 10 requests
  window: 60, // per 60 seconds
};

// Provider types
type ImageProvider = 'pollinations' | 'nanobanana';

// ============================================
// POST /api/admin/ai/generate-image
// Generate an AI image using Pollinations.ai or Nano Banana
// ============================================

async function handleGenerateImage(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    const {
      prompt,
      aspectRatio = '16:9',
      width,
      height,
      seed,
      model = 'flux',
      provider = 'pollinations', // Default to pollinations (free)
      enhance = true,
      saveToCloudinary = false,
      filename,
    } = body as {
      prompt?: string;
      aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
      width?: number;
      height?: number;
      seed?: string | number;
      model?: string;
      provider?: ImageProvider;
      enhance?: boolean;
      saveToCloudinary?: boolean;
      filename?: string;
    };

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'الوصف مطلوب' } },
        { status: 400 }
      );
    }

    if (prompt.length < 10) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'الوصف قصير جداً' } },
        { status: 400 }
      );
    }

    // Validate dimensions
    if (width && (width < 256 || width > 2048)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'العرض يجب أن يكون بين 256 و 2048' } },
        { status: 400 }
      );
    }

    if (height && (height < 256 || height > 2048)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'الارتفاع يجب أن يكون بين 256 و 2048' } },
        { status: 400 }
      );
    }

    // Check provider configuration
    if (provider === 'nanobanana' && !isNanoBananaConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'خدمة Nano Banana غير متاحة. يرجى تكوين NANO_BANANA_API_KEY أو استخدام Pollinations.ai المجاني.',
          },
        },
        { status: 503 }
      );
    }

    // Enhance prompt if requested
    const finalPrompt = enhance ? enhancePrompt(prompt, 'realistic') : prompt;

    // Check if Cloudinary is configured (needed for saveToCloudinary option)
    if (saveToCloudinary) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'خدمة Cloudinary غير متاحة. يرجى تكوين مفاتيح Cloudinary.',
            },
          },
          { status: 503 }
        );
      }
    }

    // Generate image based on provider
    let result: {
      url: string;
      width: number;
      height: number;
      seed: string | number;
      model: string;
    };
    let cloudinaryPublicId: string | undefined = undefined;

    if (provider === 'nanobanana') {
      // Use Nano Banana
      if (saveToCloudinary) {
        const nanoResult = await generateNanoBananaImageSaved(
          {
            prompt: finalPrompt,
            model: model as NanoBananaModel,
            width,
            height,
            seed: seed ? Number(seed) : undefined,
          },
          filename
        );
        result = {
          url: nanoResult.cloudinaryUrl || nanoResult.url,
          width: nanoResult.width,
          height: nanoResult.height,
          seed: nanoResult.seed,
          model: nanoResult.model,
        };
        cloudinaryPublicId = nanoResult.publicId;
      } else {
        const nanoResult = await generateNanoBananaImage({
          prompt: finalPrompt,
          model: model as NanoBananaModel,
          width,
          height,
          seed: seed ? Number(seed) : undefined,
        });
        result = {
          url: nanoResult.url,
          width: nanoResult.width,
          height: nanoResult.height,
          seed: nanoResult.seed,
          model: nanoResult.model,
        };
      }
    } else {
      // Use Pollinations (default, free)
      const generationOptions: ImageGenerationOptions = {
        prompt: finalPrompt,
        width,
        height,
        seed,
        model: model as ImageModel,
        enhance: false, // Already enhanced above
        noLogo: true,
        private: false,
      };

      if (saveToCloudinary) {
        // Download and save to Cloudinary
        try {
          const downloadResult = await downloadToCloudinary(generationOptions, filename);
          cloudinaryPublicId = downloadResult.publicId;

          result = {
            url: downloadResult.cloudinaryUrl,
            width: width || 1280,
            height: height || 720,
            seed: (seed || Math.floor(Math.random() * 1000000)).toString(),
            model,
          };
        } catch (downloadError) {
          console.error('Cloudinary upload error:', downloadError);
          // Fallback to direct URL
          if (!width && !height) {
            const pollResult = generateImageWithAspectRatio(finalPrompt, aspectRatio, {
              model: model as ImageModel,
              seed,
              enhance: false,
              noLogo: true,
            });
            result = pollResult;
          } else {
            result = generateImage(generationOptions);
          }
        }
      } else {
        // Generate with aspect ratio if no custom dimensions
        if (!width && !height) {
          result = generateImageWithAspectRatio(finalPrompt, aspectRatio, {
            model: model as ImageModel,
            seed,
            enhance: false,
            noLogo: true,
          });
        } else {
          result = generateImage(generationOptions);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.url,
        width: result.width,
        height: result.height,
        seed: String(result.seed),
        model: result.model,
        provider,
        prompt: finalPrompt,
        cloudinaryPublicId,
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'فشل توليد الصورة',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/admin/ai/generate-image/batch
// Generate multiple image variations at once
// ============================================

async function handleBatchGenerate(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      prompt,
      count = 3,
      aspectRatio = '16:9',
      width,
      height,
      model = 'flux',
      provider = 'pollinations',
      enhance = true,
    } = body as {
      prompt?: string;
      count?: number;
      aspectRatio?: '16:9' | '4:3' | '1:1';
      width?: number;
      height?: number;
      model?: string;
      provider?: ImageProvider;
      enhance?: boolean;
    };

    // Validate
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'الوصف مطلوب' } },
        { status: 400 }
      );
    }

    if (count < 1 || count > 5) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'عدد الصور يجب أن يكون بين 1 و 5' } },
        { status: 400 }
      );
    }

    // Check Nano Banana configuration
    if (provider === 'nanobanana' && !isNanoBananaConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'خدمة Nano Banana غير متاحة. يرجى تكوين NANO_BANANA_API_KEY.',
          },
        },
        { status: 503 }
      );
    }

    // Enhance prompt
    const finalPrompt = enhance ? enhancePrompt(prompt, 'realistic') : prompt;

    // Generate variations
    const variations = [];

    for (let i = 0; i < count; i++) {
      if (provider === 'nanobanana') {
        // Use Nano Banana
        const result = await generateNanoBananaImage({
          prompt: finalPrompt,
          model: model as NanoBananaModel,
          width,
          height,
        });
        variations.push({
          imageUrl: result.url,
          width: result.width,
          height: result.height,
          seed: String(result.seed),
          model: result.model,
        });
      } else {
        // Use Pollinations
        const pollResult = !width && !height
          ? generateImageWithAspectRatio(finalPrompt, aspectRatio, {
              model: model as ImageModel,
              enhance: false,
              noLogo: true,
            })
          : generateImage({
              prompt: finalPrompt,
              width,
              height,
              model: model as ImageModel,
              enhance: false,
              noLogo: true,
            });

        variations.push({
          imageUrl: pollResult.url,
          width: pollResult.width,
          height: pollResult.height,
          seed: pollResult.seed,
          model: pollResult.model,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        provider,
        prompt: finalPrompt,
        images: variations,
      },
    });
  } catch (error) {
    console.error('Batch image generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'فشل توليد الصور',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// Route Handler
// ============================================

async function handleGenerateImageRequest(request: NextRequest) {
  // Check action from request body or URL
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'generate';

  // Route to appropriate handler
  const handler = action === 'batch' ? handleBatchGenerate : handleGenerateImage;
  return handler(request);
}

export const POST = withAuth(withRateLimitMiddleware(handleGenerateImageRequest, RATE_LIMIT));

// Allow OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
