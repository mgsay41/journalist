/**
 * Complete Article API Endpoint
 * POST /api/admin/ai/complete-article
 *
 * This endpoint provides comprehensive AI-powered article analysis:
 * - Keyword extraction (focus + secondary)
 * - Category suggestions (matched with existing)
 * - Tag suggestions (matched with existing)
 * - SEO-friendly English slug generation
 * - Multiple meta title options
 * - Multiple meta description options
 * - Excerpt generation
 * - Content quality analysis (intro/conclusion suggestions)
 * - Grammar and spelling check
 * - SEO score analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  completeArticle,
  validateArticleForCompletion,
  isGeminiConfigured,
  recordAiUsage,
  GeminiError,
} from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limit";

const requestSchema = z.object({
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    // Rate limiting: 10 AI completions per minute (to control API costs)
    const rateLimitResult = await checkRateLimit(request, {
      limit: 10,
      window: 60,
      identifier: `ai:complete:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      return NextResponse.json(
        { error: "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً." },
        { status: 429 }
      );
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "لم يتم تكوين Gemini API. يرجى إضافة GEMINI_API_KEY" },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, content } = validation.data;

    // Validate article content
    const contentValidation = validateArticleForCompletion(title, content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.errors.join(", ") },
        { status: 400 }
      );
    }

    // Fetch available categories and tags from database
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.tag.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // Call the AI completion service
    const result = await completeArticle({
      title,
      content,
      availableCategories: categories,
      availableTags: tags,
    });

    // Record AI usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: "complete-article",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      }).catch(console.error); // Don't fail request if usage tracking fails
    }

    // Return the result with available categories and tags for matching
    return NextResponse.json({
      ...result.data,
      availableCategories: categories,
      availableTags: tags,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      },
    });
  } catch (error) {
    console.error("Complete article error:", error);

    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء تحليل المقال" },
      { status: 500 }
    );
  }
}
