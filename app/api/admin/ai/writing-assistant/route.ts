import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { generateContent } from '@/lib/gemini';
import { recordAiUsage, isGeminiConfigured } from '@/lib/ai';
import { z } from 'zod';
import type { AiFeature } from '@/lib/ai/usage';

// Inline AI writing assistant types
type AssistantAction =
  | 'autocomplete'
  | 'improve-word'
  | 'fix-passive'
  | 'suggest-transitions'
  | 'expand-text'
  | 'summarize-text';

const requestSchema = z.object({
  action: z.enum(['autocomplete', 'improve-word', 'fix-passive', 'suggest-transitions', 'expand-text', 'summarize-text']),
  data: z.record(z.string(), z.any()),
});

// Map action to feature type
const actionToFeature: Record<AssistantAction, AiFeature> = {
  'autocomplete': 'writing-assistant-autocomplete',
  'improve-word': 'writing-assistant-improve-word',
  'fix-passive': 'writing-assistant-fix-passive',
  'suggest-transitions': 'writing-assistant-suggest-transitions',
  'expand-text': 'writing-assistant-expand-text',
  'summarize-text': 'writing-assistant-summarize-text',
};

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

    const { action, data } = validation.data;

    // Build the appropriate prompt based on action
    let prompt: string;
    let useCache = false;
    let temperature = 0.7;

    switch (action as AssistantAction) {
      case 'autocomplete':
        prompt = buildAutocompletePrompt(data as { precedingText: string; currentPartial: string; context: string });
        useCache = false; // Don't cache dynamic content
        temperature = 0.8;
        break;

      case 'improve-word':
        prompt = buildImproveWordPrompt(data as { word: string; context: string; tone?: string });
        useCache = true;
        temperature = 0.5;
        break;

      case 'fix-passive':
        prompt = buildFixPassivePrompt(data as { sentence: string });
        useCache = true;
        temperature = 0.3;
        break;

      case 'suggest-transitions':
        prompt = buildTransitionsPrompt(data as { previousSentence: string; nextSentence: string; relationship?: string });
        useCache = true;
        temperature = 0.5;
        break;

      case 'expand-text':
        prompt = buildExpandTextPrompt(data as { text: string; context?: string; targetMultiplier?: number });
        useCache = false; // Don't cache creative content
        temperature = 0.8;
        break;

      case 'summarize-text':
        prompt = buildSummarizePrompt(data as { text: string; targetLength?: 'short' | 'medium' | 'long' });
        useCache = true;
        temperature = 0.5;
        break;
    }

    // Call AI API
    const result = await generateContent(prompt, {
      maxTokens: 4096,
      temperature,
      useCache,
    });

    // Parse response
    let aiResult;
    try {
      aiResult = JSON.parse(result.text);
    } catch {
      // If JSON parsing fails, return as plain text
      aiResult = { text: result.text };
    }

    // Record usage
    if (result.tokensUsed) {
      await recordAiUsage({
        userId: session.user.id,
        feature: actionToFeature[action as AssistantAction],
        model: 'gemini-3-flash',
        inputTokens: result.tokensUsed.input || 0,
        outputTokens: result.tokensUsed.output || 0,
        cached: result.cached || false,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      action,
      result: aiResult,
    });
  } catch (error) {
    console.error('Writing assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process writing assistant request' },
      { status: 500 }
    );
  }
}

// Prompt builders

function buildAutocompletePrompt(data: {
  precedingText: string;
  currentPartial: string;
  context: string;
}): string {
  return `أكمل الجملة الحالية بشكل احترافي:

النص السابق:
${data.precedingText.slice(-200)}

الجملة الحالية (غير مكتملة):
${data.currentPartial}

السياق العام:
${data.context.slice(-500)}

المتطلبات:
- أكمل الجملة بطريقة طبيعية واحترافية
- حافظ على الأسلوب والسياق
- اجعل الإكمال مختصراً (3-5 كلمات كحد أقصى)
- استخدم العربية الفصحى

أعد JSON فقط بالشكل التالي:
{
  "completions": [
    {
      "text": "نص الإكمال",
      "confidence": 0.9
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}

function buildImproveWordPrompt(data: {
  word: string;
  context: string;
  tone?: string;
}): string {
  return `اقترح بدائل أفضل لكلمة "${data.word}":

السياق:
${data.context}

${data.tone ? `الأسلوب المطلوب: ${data.tone}` : ''}

المتطلبات:
- اقترح 3-5 بدائل للكلمة
- كل بديل يجب أن يكون أكثر دقة أو قوة
- وضّح الفرق في المعنى أو النبرة
- تأكد أن البديل يناسب السياق

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "word": "البديل المقترح",
      "reason": "لماذا هذا البديل أفضل",
      "tone": "formal|casual|strong|subtle"
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}

function buildFixPassivePrompt(data: { sentence: string }): string {
  return `افحص الجملة التالية لاكتشاف صيغة المبني للمجهول:

الجملة: ${data.sentence}

المتطلبات:
- حدد ما إذا كانت الجملة بصيغة المبني للمجهول
- إذا كانت، اقترح البديل بالمبني للمعلوم
- وضّح لماذا البديل أفضل

أعد JSON فقط بالشكل التالي:
{
  "isPassive": true,
  "passiveSegments": [
    {
      "original": "الجزء بصيغة المجهول",
      "active": "البديل بصيغة المعلوم",
      "reason": "لماذا التغيير"
    }
  ],
  "correctedSentence": "الجملة المصححة",
  "improved": true
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}

function buildTransitionsPrompt(data: {
  previousSentence: string;
  nextSentence: string;
  relationship?: string;
}): string {
  return `اقترح كلمات انتقالية بين الجملتين:

الجملة الأولى:
${data.previousSentence}

الجملة الثانية:
${data.nextSentence}

${data.relationship ? `العلاقة المطلوبة: ${data.relationship}` : "حدد العلاقة المناسبة"}

المتطلبات:
- اقترح 5-10 كلمات انتقالية مناسبة
- كل اقتراح مع شرح موجز
- رتبها حسب الأنسبية

أعد JSON فقط بالشكل التالي:
{
  "relationship": "addition|contrast|cause|sequence|example",
  "suggestions": [
    {
      "word": "كلمة الانتقال",
      "placement": "كيفية وضعها",
      "reason": "لماذا مناسبة"
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}

function buildExpandTextPrompt(data: {
  text: string;
  context?: string;
  targetMultiplier?: number;
}): string {
  const multiplier = data.targetMultiplier || 2;

  return `وسّع النص التالي ${multiplier} مرات تقريباً:

النص:
${data.text}

${data.context ? `السياق:\n${data.context}` : ''}

المتطلبات:
- وسّع النص بإضافة تفاصيل وأمثلة
- حافظ على المعنى الأساسي
- استخدم أسلوباً صحفياً احترافياً
- أضف جمل انتقالية مناسبة

أعد JSON فقط بالشكل التالي:
{
  "expandedText": "النص الموسّع",
  "wordCountOriginal": 50,
  "wordCountExpanded": 100,
  "addedDetails": ["تفصيل 1", "تفصيل 2"]
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}

function buildSummarizePrompt(data: {
  text: string;
  targetLength?: 'short' | 'medium' | 'long';
}): string {
  const lengthMap = {
    short: '50-100 كلمة',
    medium: '100-200 كلمة',
    long: '200-300 كلمة',
  };

  return `لخص النص التالي:

${data.text}

المتطلبات:
- الطول المطلوب: ${lengthMap[data.targetLength || 'medium']}
- حافظ على النقاط الرئيسية
- استخدم أسلوباً واضحاً ومباشراً

أعد JSON فقط بالشكل التالي:
{
  "summary": "الملخص",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"],
  "wordCount": 150
}

مهم جداً: أعد JSON صالح ومكتمل فقط.`;
}
