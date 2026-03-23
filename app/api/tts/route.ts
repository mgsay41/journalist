import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAX_TEXT_LENGTH = 50000;
const TTS_FOLDER = 'tts';
const DEFAULT_VOICE = 'ar-SA-ZariyahNeural';

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, text, title } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'معرف المقالة مطلوب' }, { status: 400 });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 });
    }

    const plainText = extractTextFromHtml(text);
    const fullText = title ? `${title}. ${plainText}` : plainText;

    if (fullText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `النص طويل جداً. الحد الأقصى ${MAX_TEXT_LENGTH} حرف` },
        { status: 400 }
      );
    }

    const publicId = `${TTS_FOLDER}/${slug}`;

    try {
      const existingResource = await cloudinary.api.resource(publicId, {
        resource_type: 'video',
      });
      return NextResponse.json({ url: existingResource.secure_url });
    } catch {
      // Cache miss — continue to generate
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(fullText);
    const chunks: Buffer[] = [];

    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'video',
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({ secure_url: result.secure_url });
          } else {
            reject(new Error('Upload failed: No result returned'));
          }
        }
      );
      uploadStream.end(audioBuffer);
    });

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'فشل في توليد الصوت. يرجى المحاولة مرة أخرى.' },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'معرف المقالة مطلوب' }, { status: 400 });
    }

    const publicId = `${TTS_FOLDER}/${slug}`;

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('TTS cache delete error:', error);
    return NextResponse.json(
      { error: 'فشل في حذف الكاش' },
      { status: 500 }
    );
  }
}
