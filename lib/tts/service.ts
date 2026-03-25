import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAX_TEXT_LENGTH = 50000;
const TTS_FOLDER = "tts";
const DEFAULT_VOICE = "ar-SA-ZariyahNeural";

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export interface TtsResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function generateAndCacheTts(
  slug: string,
  htmlContent: string
): Promise<TtsResult> {
  try {
    const fullText = extractTextFromHtml(htmlContent);

    if (!fullText || fullText.length === 0) {
      return { success: false, error: "No text content to convert" };
    }

    if (fullText.length > MAX_TEXT_LENGTH) {
      return {
        success: false,
        error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters`,
      };
    }

    const publicId = `${TTS_FOLDER}/${slug}`;

    try {
      const existingResource = await cloudinary.api.resource(publicId, {
        resource_type: "video",
      });
      return { success: true, url: existingResource.secure_url };
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

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "video",
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({ secure_url: result.secure_url });
            } else {
              reject(new Error("Upload failed: No result returned"));
            }
          }
        );
        uploadStream.end(audioBuffer);
      }
    );

    return { success: true, url: uploadResult.secure_url };
  } catch (error) {
    console.error("TTS generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteTtsCache(slug: string): Promise<boolean> {
  try {
    const publicId = `${TTS_FOLDER}/${slug}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    return true;
  } catch {
    return true;
  }
}

export async function getTtsUrl(slug: string): Promise<string | null> {
  try {
    const publicId = `${TTS_FOLDER}/${slug}`;
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
    return resource.secure_url;
  } catch {
    return null;
  }
}
