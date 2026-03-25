import { NextRequest, NextResponse } from "next/server";
import {
  generateAndCacheTts,
  deleteTtsCache,
} from "@/lib/tts/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, text } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "معرف المقالة مطلوب" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "النص مطلوب" }, { status: 400 });
    }

    const result = await generateAndCacheTts(slug, text);

    if (!result.success) {
      return NextResponse.json(
        { error: "فشل في توليد الصوت. يرجى المحاولة مرة أخرى." },
        { status: 503 }
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "فشل في توليد الصوت. يرجى المحاولة مرة أخرى." },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "معرف المقالة مطلوب" },
        { status: 400 }
      );
    }

    await deleteTtsCache(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TTS cache delete error:", error);
    return NextResponse.json({ error: "فشل في حذف الكاش" }, { status: 500 });
  }
}
