/**
 * Image Alt Text Generation API Endpoint
 * POST /api/admin/ai/image-alt-text
 * Generate alt text for images based on URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { generateContent, isGeminiConfigured } from "@/lib/gemini";
import { z } from "zod";

const requestSchema = z.object({
  imageUrl: z.string().url({ message: "رابط الصورة غير صالح" }),
  filename: z.string().optional(),
});

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

    const { imageUrl, filename } = validation.data;

    // For now, use a text-based approach with the image URL
    // In production, you would analyze the actual image
    const prompt = `Generate a descriptive alt text (نص بديل) in Arabic for an image.
${filename ? `The image filename is: "${filename}"` : ""}
${imageUrl ? `The image is from: ${imageUrl}` : ""}

The alt text should:
1. Be concise (usually 125 characters or less)
2. Describe the important visual content
3. Be written in Arabic
4. Focus on what's visually relevant to understanding the image

Return only the alt text in Arabic, without any additional explanation or formatting.`;

    const result = await generateContent(prompt, {
      model: "gemini-3-flash",
      maxTokens: 100,
      temperature: 0.3,
    });

    return NextResponse.json({
      altText: result.text.trim(),
      success: true,
    });
  } catch (error) {
    console.error("Image alt text generation error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء توليد النص البديل" },
      { status: 500 }
    );
  }
}
