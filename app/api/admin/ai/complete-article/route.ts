/**
 * Complete Article API Endpoint — SSE streaming
 * POST /api/admin/ai/complete-article
 *
 * Returns a Server-Sent Events stream with step progress events:
 *   { type: 'step', step: 0..5 }   — a step started
 *   { type: 'complete', data: ... } — all done, full results attached
 *   { type: 'error', message: '...' } — something failed
 */

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  completeArticlePhase1,
  completeArticlePhase2,
  completeArticlePhase3,
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
  // Check authentication
  const session = await getServerSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "غير مصرح بالوصول" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(request, {
    limit: 10,
    window: 60,
    identifier: `ai:complete:${session.user.id}`,
  });
  if (rateLimitResult === null || !rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check Gemini config
  if (!isGeminiConfigured()) {
    return new Response(
      JSON.stringify({ error: "لم يتم تكوين Gemini API. يرجى إضافة GEMINI_API_KEY" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse and validate body
  let title: string, content: string;
  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.issues[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    title = validation.data.title;
    content = validation.data.content;
  } catch {
    return new Response(
      JSON.stringify({ error: "طلب غير صالح" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Content validation
  const contentValidation = validateArticleForCompletion(title, content);
  if (!contentValidation.valid) {
    return new Response(
      JSON.stringify({ error: contentValidation.errors.join(", ") }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch DB categories and tags
  const [categories, tags] = await prisma.$transaction([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const totalUsage = { inputTokens: 0, outputTokens: 0 };

      try {
        // ── Step 0: تحليل المحتوى ─────────────────────────────────────────
        send({ type: "step", step: 0 });

        const phase1 = await completeArticlePhase1({
          title, content,
          availableCategories: categories,
          availableTags: tags,
        });
        totalUsage.inputTokens += phase1.usage.inputTokens;
        totalUsage.outputTokens += phase1.usage.outputTokens;

        // Steps 0 (content analysis) and 1 (keywords) are both covered by phase1
        send({ type: "step", step: 2 });

        // ── Step 2-3: تصنيف + توليد الميتا ───────────────────────────────
        const phase2 = await completeArticlePhase2({
          title,
          content,
          focusKeyword: phase1.data.focusKeyword,
        });
        totalUsage.inputTokens += phase2.usage.inputTokens;
        totalUsage.outputTokens += phase2.usage.outputTokens;

        // Steps 2 (categories) and 3 (meta) both done
        send({ type: "step", step: 4 });

        // ── Step 4: التدقيق اللغوي ────────────────────────────────────────
        const phase3 = await completeArticlePhase3({ content });
        totalUsage.inputTokens += phase3.usage.inputTokens;
        totalUsage.outputTokens += phase3.usage.outputTokens;

        send({ type: "step", step: 5 });

        // ── Step 5: تحليل SEO — computed immediately ─────────────────────
        // SEO score is computed client-side via analyzeArticle() in real time,
        // so we provide a placeholder here that the client already overrides.
        const seoAnalysis = {
          score: 70,
          status: "needs-improvement" as const,
          topIssues: [],
        };

        // ── Combine and send complete ─────────────────────────────────────
        const result = {
          ...phase1.data,
          ...phase2.data,
          grammarIssues: phase3.data.grammarIssues,
          seoAnalysis,
          availableCategories: categories,
          availableTags: tags,
        };

        send({ type: "complete", data: result });

        // Record usage
        await recordAiUsage({
          userId,
          feature: "complete-article",
          model: "gemini-2.5-flash",
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          cached: false,
        }).catch(console.error);

        controller.close();
      } catch (err) {
        console.error("Complete article SSE error:", err);
        const message = err instanceof GeminiError
          ? err.message
          : "حدث خطأ غير متوقع أثناء تحليل المقال";
        send({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
