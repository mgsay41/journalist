import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { generateContent } from '@/lib/gemini';
import { recordAiUsage, isGeminiConfigured, parseJsonResponse } from '@/lib/ai';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limit';

const requestSchema = z.object({
  headline: z.string().min(1, 'Headline is required'),
  content: z.string().optional(),
  category: z.string().optional(),
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
      identifier: `ai:optimize-headline:${session.user.id}`,
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

    const { headline, content, category } = validation.data;

    // Build the prompt
    const prompt = `حلّل وحقّن العنوان التالي:

العنوان الحالي:
${headline}

${content ? `محتوى المقال (أول 500 كلمة):\n${content.substring(0, 1000)}` : ''}
${category ? `التصنيف: ${category}` : ''}

المتطلبات:
1. قيّم العنوان الحالي (0-100)
2. اقترح 10 عناوين بديلة محسّنة:
   - 3 عناوين احترافية
   - 3 عناوين جذابة (click-worthy)
   - 2 عنوان بكلمات قوية
   - 2 عنوان بأرقام
3. لكل عنوان، حدد:
   - الدرجة المتوقعة (CTR score)
   - الطول (عدد الأحرف)
   - يحتوي على كلمات قوية؟
   - يحتوي على رقم؟
   - الكلمات المفتاحية المستخدمة

أعد JSON فقط بالشكل التالي:
{
  "currentHeadline": {
    "headline": "العنوان الحالي",
    "score": 65,
    "length": 45,
    "hasPowerWords": false,
    "hasNumber": false,
    "issues": ["مشكلة 1", "مشكلة 2"]
  },
  "suggestions": [
    {
      "headline": "العنوان المقترح",
      "score": 85,
      "length": 48,
      "type": "professional|catchy|power-words|number",
      "hasPowerWords": true,
      "hasNumber": false,
      "improvements": ["تحسين 1", "تحسين 2"]
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;

    // Call AI API (cache enabled: same headline input produces same optimization)
    const result = await generateContent(prompt, {
      maxTokens: 8192,
      temperature: 0.8,
      useCache: true,
    });

    // Parse response
    let analysis;
    try {
      analysis = parseJsonResponse<{
        currentHeadline: {
          headline: string;
          score: number;
          length: number;
          hasPowerWords: boolean;
          hasNumber: boolean;
          issues: string[];
        };
        suggestions: Array<{
          headline: string;
          score: number;
          length: number;
          type: 'professional' | 'catchy' | 'power-words' | 'number';
          hasPowerWords: boolean;
          hasNumber: boolean;
          improvements: string[];
        }>;
        recommended: number;
      }>(result.text);
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
        feature: 'headline-optimization',
        model: result.model as import('@/lib/gemini').GeminiModelId,
        inputTokens: result.tokensUsed.input || 0,
        outputTokens: result.tokensUsed.output || 0,
        cached: result.cached || false,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Headline optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize headline' },
      { status: 500 }
    );
  }
}
