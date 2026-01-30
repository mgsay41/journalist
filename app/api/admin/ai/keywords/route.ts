/**
 * Keyword Extraction API Endpoint
 * POST /api/admin/ai/keywords
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { extractKeywords, safeAiCall, isGeminiConfigured, recordAiUsage } from "@/lib/ai";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "لم يتم تكوين Gemini API" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await safeAiCall(() =>
      extractKeywords(validation.data)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "فشل في استخراج الكلمات المفتاحية" },
        { status: 500 }
      );
    }

    // Record AI usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: "keywords",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      }).catch(console.error);
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Keyword extraction error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
