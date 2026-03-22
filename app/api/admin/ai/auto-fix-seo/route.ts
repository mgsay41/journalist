/**
 * SEO Auto-Fix API Endpoint
 * POST /api/admin/ai/auto-fix-seo
 *
 * Automatically fixes SEO issues:
 * - internal-links: Adds relevant internal links
 * - external-links: Adds relevant external links
 * - long-paragraphs: Splits long paragraphs
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  autoFixInternalLinks,
  autoFixExternalLinks,
  autoFixLongParagraphs,
  autoFixSeoIssues,
  safeAiCall,
  isGeminiConfigured,
  recordAiUsage,
  type AiFeature,
} from "@/lib/ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Map action to feature name for usage tracking
const actionToFeature: Record<string, AiFeature> = {
  "internal-links": "auto-fix-internal-links",
  "external-links": "auto-fix-external-links",
  "long-paragraphs": "auto-fix-long-paragraphs",
  "all": "auto-fix-seo-issues",
};

const internalLinksSchema = z.object({
  action: z.literal("internal-links"),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  targetCount: z.number().optional(),
});

const externalLinksSchema = z.object({
  action: z.literal("external-links"),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  targetCount: z.number().optional(),
});

const longParagraphsSchema = z.object({
  action: z.literal("long-paragraphs"),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  maxWords: z.number().optional(),
});

const autoFixAllSchema = z.object({
  action: z.literal("all"),
  title: z.string().min(1, { message: "العنوان مطلوب" }),
  content: z.string().min(1, { message: "المحتوى مطلوب" }),
  issuesToFix: z.array(z.enum(["internal-links", "external-links", "long-paragraphs"])).min(1),
});

const requestSchema = z.discriminatedUnion("action", [
  internalLinksSchema,
  externalLinksSchema,
  longParagraphsSchema,
  autoFixAllSchema,
]);

/**
 * Get available articles for internal linking
 */
async function getAvailableArticles(excludeArticleId?: string) {
  return prisma.article.findMany({
    where: {
      status: "published",
      ...(excludeArticleId ? { id: { not: excludeArticleId } } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      categories: {
        select: {
          name: true,
        },
        take: 1,
      },
    },
    orderBy: {
      views: "desc", // Most viewed articles first
    },
    take: 50,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    // Rate limiting: 10 AI SEO-fix requests per hour per user
    const rateLimitResult = await checkRateLimit(request, {
      limit: 10,
      window: 3600,
      identifier: `ai:auto-fix-seo:${session.user.id}`,
    });
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
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
      case "internal-links": {
        const availableArticles = await getAvailableArticles();
        const formattedArticles = availableArticles.map(a => ({
          title: a.title,
          slug: a.slug,
          category: a.categories[0]?.name || "عام",
        }));

        result = await safeAiCall(() =>
          autoFixInternalLinks({
            title: data.title,
            content: data.content,
            availableArticles: formattedArticles,
            targetCount: data.targetCount,
          })
        );
        break;
      }

      case "external-links":
        result = await safeAiCall(() =>
          autoFixExternalLinks({
            title: data.title,
            content: data.content,
            targetCount: data.targetCount,
          })
        );
        break;

      case "long-paragraphs":
        result = await safeAiCall(() =>
          autoFixLongParagraphs({
            content: data.content,
            maxWords: data.maxWords,
          })
        );
        break;

      case "all": {
        const availableArticles = await getAvailableArticles();
        const formattedArticles = availableArticles.map(a => ({
          title: a.title,
          slug: a.slug,
          category: a.categories[0]?.name || "عام",
        }));

        result = await safeAiCall(() =>
          autoFixSeoIssues({
            title: data.title,
            content: data.content,
            issuesToFix: data.issuesToFix,
            availableArticles: formattedArticles,
          })
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: "إجراء غير صالح" },
          { status: 400 }
        );
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
    console.error("SEO auto-fix error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
