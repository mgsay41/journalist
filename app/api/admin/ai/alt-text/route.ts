/**
 * Image Alt Text Generation API Endpoint
 * POST /api/admin/ai/alt-text
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { generateAltText, safeAiCall, isGeminiConfigured, recordAiUsage } from "@/lib/ai";
import { z } from "zod";

const requestSchema = z.object({
  articleTitle: z.string().min(1, { message: "عنوان المقال مطلوب" }),
  articleContext: z.string().min(1, { message: "سياق المقال مطلوب" }),
  imagePosition: z.enum(["featured", "inline"]),
  existingCaption: z.string().optional(),
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
      generateAltText(validation.data)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "فشل في توليد النص البديل" },
        { status: 500 }
      );
    }

    // Record AI usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: "alt-text",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      }).catch(console.error);
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Alt text generation error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
