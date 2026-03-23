import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { generateContent } from '@/lib/gemini';
import { recordAiUsage, isGeminiConfigured } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limit';

const requestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  maxTags: z.number().min(3).max(15).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 AI requests per hour per user
    const rateLimitResult = await checkRateLimit(request, {
      limit: 20,
      window: 3600,
      identifier: `ai:auto-tags:${session.user.id}`,
    });
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: 'لم يتم تكوين Gemini API' },
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

    const { title, content, maxTags = 10 } = validation.data;

    // Fetch existing tags with usage counts
    const existingTags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: 200,
    });

    // Format tags for prompt
    const tagList = existingTags
      .slice(0, 100)
      .map(t => `"${t.name}"${t._count.articles > 0 ? ` (${t._count.articles})` : ''}`)
      .join('، ');

    // Build the prompt
    const prompt = `استخرج الوسوم المناسبة من القائمة المتاحة للمقال التالي:

العنوان: ${title}

المحتوى:
${content.substring(0, 3000)}

الوسوم المتاحة في الموقع (مع عدد الاستخدام):
${tagList || 'لا توجد وسوم'}

المطلوب:
- اختر من 3 إلى ${maxTags} وسوم كحد أقصى
- يجب أن تكون جميع الوسوم من القائمة المتاحة أعلاه
- رتّب الوسوم حسب الأهمية
- لكل وسم، حدد مدى ملاءمته (ثقة)

أعد JSON فقط بالشكل التالي:
{
  "selectedTags": [
    {
      "name": "اسم الوسم (كما هو في القائمة)",
      "confidence": 0.95,
      "relevance": "high",
      "reason": "سبب الاختيار"
    }
  ],
  "primaryTag": {
    "name": "الوسم الرئيسي",
    "reason": "لماذا هو الأهم"
  }
}

مهم جداً:
- أعد JSON صالح ومكتمل فقط
- انسخ أسماء الوسوم بالضبط من القائمة المتاحة
- لا تقترح وسوماً جديدة`;

    // Call AI API
    const result = await generateContent(prompt, {
      maxTokens: 8192,
      temperature: 0.5,
      useCache: true,
    });

    // Parse response
    let aiResult;
    try {
      aiResult = JSON.parse(result.text);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Enrich selected tags with IDs
    if (aiResult.selectedTags && Array.isArray(aiResult.selectedTags)) {
      aiResult.selectedTags = aiResult.selectedTags.map((tag: { name: string; confidence: number; relevance: string; reason: string }) => {
        const existingTag = existingTags.find(t => t.name === tag.name);
        return {
          ...tag,
          id: existingTag?.id || null,
          isNew: !existingTag,
        };
      });
    }

    // Enrich primary tag with ID
    if (aiResult.primaryTag && aiResult.primaryTag.name) {
      const primaryExisting = existingTags.find(
        t => t.name === aiResult.primaryTag.name
      );
      aiResult.primaryTag = {
        ...aiResult.primaryTag,
        id: primaryExisting?.id || null,
        isNew: !primaryExisting,
      };
    }

    // Record usage
    if (result.tokensUsed) {
      await recordAiUsage({
        userId: session.user.id,
        feature: 'auto-tagging',
        model: result.model as import('@/lib/gemini').GeminiModelId,
        inputTokens: result.tokensUsed.input || 0,
        outputTokens: result.tokensUsed.output || 0,
        cached: result.cached || false,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      tags: aiResult,
    });
  } catch (error) {
    console.error('Auto-tagging error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tags' },
      { status: 500 }
    );
  }
}
