/**
 * FAQ Generation API Endpoint
 * POST /api/admin/ai/faq
 *
 * Generates 4-6 FAQ pairs from article content.
 * Output includes both JSON pairs and ready-to-insert HTML block.
 * FAQs are structured for GEO (AI engine extraction) and featured snippets.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  generateFaqSection,
  safeAiCall,
  isGeminiConfigured,
  recordAiUsage,
} from "@/lib/ai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limit";

const requestSchema = z.object({
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(50, { message: "المحتوى قصير جداً — يجب أن يكون 50 حرف على الأقل" }),
  focusKeyword: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // Rate limiting: 20 requests/hour per user
    const rateLimitResult = await checkRateLimit(request, {
      limit: 20,
      window: 3600,
      identifier: `ai:faq:${session.user.id}`,
    });
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً." },
        { status: 429 }
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: "لم يتم تكوين Gemini API" }, { status: 503 });
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
      generateFaqSection({
        title: validation.data.title,
        content: validation.data.content,
        focusKeyword: validation.data.focusKeyword,
      })
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error?.message || "فشل توليد الأسئلة الشائعة" },
        { status: 500 }
      );
    }

    // Track usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: "faq-generation",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      });
    }

    return NextResponse.json({
      faqs: result.data.faqs,
      html: result.data.html,
    });
  } catch (error) {
    console.error("FAQ generation error:", error);
    return NextResponse.json(
      { error: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
