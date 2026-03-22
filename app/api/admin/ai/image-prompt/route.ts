import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withAuth, withRateLimitMiddleware } from '@/lib/security/middleware';
import {
  generateImagePrompt,
  enhanceImagePrompt,
  generatePromptVariations,
  safeAiCall,
  type GeneratedImagePrompt,
} from '@/lib/ai/image-prompt';

// Rate limiting configuration
const RATE_LIMIT = {
  limit: 20, // 20 requests
  window: 60, // per 60 seconds
};

// ============================================
// POST /api/admin/ai/image-prompt
// Generate an AI image prompt for featured image
// ============================================

async function handleImagePrompt(req: NextRequest) {
  // Parse request body
  const body = await req.json();

  const {
    title,
    content,
    category,
    style = 'professional',
    aspectRatio = '16:9',
    action = 'generate', // 'generate', 'enhance', 'variations'
    basePrompt,
    improvements,
    variations = 3,
  } = body as {
    title?: string;
    content?: string;
    category?: string;
    style?: 'professional' | 'casual' | 'artistic' | 'minimalist' | 'editorial';
    aspectRatio?: '16:9' | '4:3' | '1:1';
    action?: 'generate' | 'enhance' | 'variations';
    basePrompt?: string;
    improvements?: string[];
    variations?: number;
  };

  // Validate required fields
  if (action === 'generate') {
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'العنوان مطلوب' } },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'المحتوى مطلوب' } },
        { status: 400 }
      );
    }

    if (content.length < 50) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'المحتوى قصير جداً (أقل من 50 حرف)' } },
        { status: 400 }
      );
    }
  } else if (action === 'enhance') {
    if (!basePrompt || typeof basePrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'الوصف الأساسي مطلوب' } },
        { status: 400 }
      );
    }
  }

  // Check if Gemini API key is configured
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'خدمة الذكاء الاصطناعي غير متاحة. يرجى تكوين مفتاح GEMINI_API_KEY.',
        },
      },
      { status: 503 }
    );
  }

  // Execute the appropriate action
  let result;

  if (action === 'generate') {
    result = await safeAiCall(() =>
      generateImagePrompt({
        title: title!.trim(),
        content: content!.trim(),
        category,
        style,
        aspectRatio,
      })
    );
  } else if (action === 'enhance') {
    const articleContext = content || title || '';
    result = await safeAiCall(() =>
      enhanceImagePrompt({
        basePrompt: basePrompt!.trim(),
        articleContext: articleContext.trim(),
        improvements,
      })
    );
  } else if (action === 'variations') {
    result = await safeAiCall(() =>
      generatePromptVariations({
        title: title!.trim(),
        content: content!.trim(),
        category,
        count: Math.min(variations!, 5),
      })
    );
  } else {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'إجراء غير صالح' } },
      { status: 400 }
    );
  }

  // Return the result
  if (result.success && result.data) {
    return NextResponse.json({
      success: true,
      data: result.data,
      usage: result.usage,
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: result.error || { code: 'UNKNOWN', message: 'فشل توليد الوصف' },
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(withRateLimitMiddleware(handleImagePrompt, RATE_LIMIT));

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
