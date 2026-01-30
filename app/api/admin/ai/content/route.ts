/**
 * Content Assistance API Endpoint
 * POST /api/admin/ai/content
 *
 * Supports multiple actions:
 * - expand: Expand selected text
 * - summarize: Summarize content
 * - rewrite: Rewrite with different tone
 * - introduction: Generate introduction
 * - conclusion: Generate conclusion
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  expandContent,
  summarizeContent,
  rewriteContent,
  generateIntroduction,
  generateConclusion,
  safeAiCall,
  isGeminiConfigured,
  recordAiUsage,
  type AiFeature,
} from "@/lib/ai";
import { z } from "zod";

// Map action to feature name for usage tracking
const actionToFeature: Record<string, AiFeature> = {
  expand: "expand-content",
  summarize: "summarize-content",
  rewrite: "rewrite-content",
  introduction: "generate-intro",
  conclusion: "generate-conclusion",
};

const expandSchema = z.object({
  action: z.literal("expand"),
  selectedText: z.string().min(1, { message: "النص المحدد مطلوب" }),
  context: z.string().min(1, { message: "السياق مطلوب" }),
  tone: z.enum(["formal", "casual", "professional"]).optional(),
});

const summarizeSchema = z.object({
  action: z.literal("summarize"),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  targetLength: z.enum(["short", "medium", "long"]).optional(),
});

const rewriteSchema = z.object({
  action: z.literal("rewrite"),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  tone: z.enum(["formal", "casual", "professional", "simplified"]),
  preserveMeaning: z.boolean().optional(),
});

const introSchema = z.object({
  action: z.literal("introduction"),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  focusKeyword: z.string().optional(),
});

const conclusionSchema = z.object({
  action: z.literal("conclusion"),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  focusKeyword: z.string().optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  expandSchema,
  summarizeSchema,
  rewriteSchema,
  introSchema,
  conclusionSchema,
]);

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

    const data = validation.data;
    let result;

    switch (data.action) {
      case "expand":
        result = await safeAiCall(() =>
          expandContent({
            selectedText: data.selectedText,
            context: data.context,
            tone: data.tone,
          })
        );
        break;

      case "summarize":
        result = await safeAiCall(() =>
          summarizeContent({
            content: data.content,
            targetLength: data.targetLength,
          })
        );
        break;

      case "rewrite":
        result = await safeAiCall(() =>
          rewriteContent({
            content: data.content,
            tone: data.tone,
            preserveMeaning: data.preserveMeaning,
          })
        );
        break;

      case "introduction":
        result = await safeAiCall(() =>
          generateIntroduction({
            title: data.title,
            content: data.content,
            focusKeyword: data.focusKeyword,
          })
        );
        break;

      case "conclusion":
        result = await safeAiCall(() =>
          generateConclusion({
            title: data.title,
            content: data.content,
            focusKeyword: data.focusKeyword,
          })
        );
        break;
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "فشل في معالجة المحتوى" },
        { status: 500 }
      );
    }

    // Record AI usage
    if (result.usage) {
      await recordAiUsage({
        userId: session.user.id,
        feature: actionToFeature[data.action],
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cached: result.usage.cached,
      }).catch(console.error);
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Content assistance error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
