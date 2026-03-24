/**
 * Rewrite Article API Endpoint — SSE streaming
 * POST /api/admin/ai/rewrite-article
 *
 * Returns a Server-Sent Events stream with step progress events:
 *   { type: 'step', step: 0..2, message: '...' }   — a step started
 *   { type: 'complete', data: ... } — all done, full results attached
 *   { type: 'error', message: '...' } — something failed
 */

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  rewriteArticle,
  isGeminiConfigured,
  recordAiUsage,
  GeminiError,
} from "@/lib/ai";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  articleId: z.string().optional(),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  focusKeyword: z.string().min(1, { message: "الكلمة المفتاحية مطلوبة" }),
  seoScore: z.number().min(0).max(100),
  seoTopIssues: z.array(z.string()),
  iteration: z.number().min(0).default(0),
  articleType: z.string().default("article"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "غير مصرح بالوصول" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rateLimitResult = await checkRateLimit(request, {
    limit: 5,
    window: 60,
    identifier: `ai:rewrite:${session.user.id}`,
  });
  if (rateLimitResult === null || !rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isGeminiConfigured()) {
    return new Response(
      JSON.stringify({ error: "لم يتم تكوين Gemini API. يرجى إضافة GEMINI_API_KEY" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let validatedData: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.issues[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    validatedData = validation.data;
  } catch {
    return new Response(
      JSON.stringify({ error: "طلب غير صالح" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "step", step: 0, message: "تحليل المحتوى..." });

        await new Promise(resolve => setTimeout(resolve, 500));

        send({ type: "step", step: 1, message: "إعادة الكتابة بالذكاء الاصطناعي..." });

        const result = await rewriteArticle({
          title: validatedData.title,
          content: validatedData.content,
          focusKeyword: validatedData.focusKeyword,
          seoScore: validatedData.seoScore,
          seoTopIssues: validatedData.seoTopIssues,
          iteration: validatedData.iteration,
          articleType: validatedData.articleType,
        });

        send({ type: "step", step: 2, message: "اكتمل" });

        send({
          type: "complete",
          data: {
            rewrittenContent: result.data.rewrittenContent,
            rewrittenTitle: result.data.rewrittenTitle,
            changesSummary: result.data.changesSummary,
            articleId: validatedData.articleId,
          },
        });

        await recordAiUsage({
          userId,
          feature: "rewrite-article",
          model: "gemini-2.5-flash",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          cached: false,
        }).catch(console.error);

        controller.close();
      } catch (err) {
        console.error("Rewrite article SSE error:", err);
        const message = err instanceof GeminiError
          ? err.message
          : "حدث خطأ غير متوقع أثناء إعادة كتابة المقال";
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
