import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { generateContent } from '@/lib/gemini';
import { recordAiUsage, isGeminiConfigured } from '@/lib/ai';
import { z } from 'zod';

const requestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  category: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'academic', 'opinion']).optional(),
  targetLength: z.number().optional(),
  keyPoints: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { topic, category, tone, targetLength, keyPoints } = validation.data;

    // Build prompt for outline generation
    const toneText = {
      professional: 'أسلوب صحفي احترافي',
      casual: 'أسلوب بسيط وسهل الفهم',
      academic: 'أسلوب أكاديمي وبحثي',
      opinion: 'أسلوب رأي وتحليل شخصي',
    };

    const prompt = `أنشئ مخططاً تفصيلياً لمقال عن الموضوع التالي:

الموضوع: ${topic}
${category ? `التصنيف: ${category}` : ''}
${tone ? `الأسلوب: ${toneText[tone]}` : ''}
${targetLength ? `الطول المستهدف: ${targetLength} كلمة` : ''}
${keyPoints?.length ? `النقاط الرئيسية:\n${keyPoints.join('\n')}` : ''}

المطلوب:
1. أنشئ هيكلاً للمقال بأسلوب هرمي مقلوب (الأهم أولاً)
2. قسّم المقال إلى أقسام رئيسية (H2) وأقسام فرعية (H3)
3. لكل قسم، اكتب عنواناً واضحاً وجذاباً ووصفاً مختصراً
4. حدد عدد الكلمات المقترح لكل قسم
5. اقترح مقدمة وخاتمة للمقال

أعد JSON فقط بالشكل التالي:
{
  "title": "عنوان مقترح للمقال",
  "estimatedReadingTime": 5,
  "outline": [
    {
      "level": 1,
      "title": "عنوان القسم الرئيسي (H2)",
      "description": "وصف مختصر لمحتوى هذا القسم",
      "keyPoints": ["نقطة 1", "نقطة 2"],
      "wordCount": 150
    }
  ],
  "introduction": {
    "title": "عنوان المقدمة",
    "suggestedHook": "جملة افتتاحية جاذبة",
    "wordCount": 100
  },
  "conclusion": {
    "title": "عنوان الخاتمة",
    "wordCount": 80
  }
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;

    // Call AI API
    const result = await generateContent(prompt, {
      maxTokens: 8192,
      temperature: 0.7,
    });

    // Parse response
    let outline;
    try {
      outline = JSON.parse(result.text);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Record usage
    if (result.tokensUsed) {
      await recordAiUsage({
        userId: session.user.id,
        feature: 'outline-generation',
        model: 'gemini-3-flash',
        inputTokens: result.tokensUsed.input || 0,
        outputTokens: result.tokensUsed.output || 0,
        cached: result.cached || false,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      outline,
    });
  } catch (error) {
    console.error('Outline generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate outline' },
      { status: 500 }
    );
  }
}
