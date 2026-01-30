/**
 * AI Status API Endpoint
 * GET /api/admin/ai/status
 *
 * Returns:
 * - Configuration status
 * - Rate limit status
 * - Available models
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  isGeminiConfigured,
  getRateLimitStatus,
  GEMINI_MODELS,
  getModelInfo,
} from "@/lib/ai";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    const configured = isGeminiConfigured();
    const rateLimitStatus = configured ? getRateLimitStatus() : null;
    const currentModel = getModelInfo();

    return NextResponse.json({
      configured,
      rateLimitStatus,
      currentModel: {
        id: currentModel.id,
        name: currentModel.name,
        description: currentModel.description,
      },
      availableModels: Object.values(GEMINI_MODELS).map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        inputCost: model.inputCost,
        outputCost: model.outputCost,
      })),
      features: [
        { id: "seo-suggestions", name: "اقتراحات SEO", enabled: configured },
        { id: "meta-title", name: "توليد عنوان الميتا", enabled: configured },
        { id: "meta-description", name: "توليد وصف الميتا", enabled: configured },
        { id: "keywords", name: "استخراج الكلمات المفتاحية", enabled: configured },
        { id: "expand", name: "توسيع المحتوى", enabled: configured },
        { id: "summarize", name: "تلخيص المحتوى", enabled: configured },
        { id: "rewrite", name: "إعادة الصياغة", enabled: configured },
        { id: "introduction", name: "توليد المقدمة", enabled: configured },
        { id: "conclusion", name: "توليد الخاتمة", enabled: configured },
        { id: "grammar", name: "التدقيق اللغوي", enabled: configured },
        { id: "alt-text", name: "توليد النص البديل", enabled: configured },
        { id: "related-topics", name: "المواضيع ذات الصلة", enabled: configured },
      ],
    });
  } catch (error) {
    console.error("AI status error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
