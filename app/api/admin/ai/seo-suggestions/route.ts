/**
 * SEO Suggestions API Endpoint
 * POST /api/admin/ai/seo-suggestions
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getSeoSuggestions, safeAiCall, isGeminiConfigured, recordAiUsage } from "@/lib/ai";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  excerpt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
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

    // Get AI suggestions
    const result = await safeAiCall(() =>
      getSeoSuggestions(validation.data)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "فشل في الحصول على اقتراحات SEO" },
        { status: 500 }
      );
    }

    // Record AI usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: "seo-suggestions",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      }).catch(console.error); // Don't fail request if usage tracking fails
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("SEO suggestions error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
