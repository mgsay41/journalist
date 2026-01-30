import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Image size configurations
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, crop: 'fill' as const },
  medium: { width: 800, crop: 'scale' as const },
  large: { width: 1200, crop: 'scale' as const },
} as const;

// Allowed image types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Folder name in Cloudinary
export const CLOUDINARY_FOLDER = 'journalist-cms';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resource_type: string;
}

export interface ProcessedImageUrls {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

/**
 * Upload an image to Cloudinary
 * @param fileBuffer - The image file buffer
 * @param filename - Original filename for reference
 * @returns Cloudinary upload response
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: 'image',
        // Auto-optimize the image
        quality: 'auto:good',
        fetch_format: 'auto',
        // Add original filename as context
        context: `original_filename=${filename}`,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Generate URLs for different image sizes using Cloudinary transformations
 * @param publicId - The Cloudinary public ID
 * @returns Object with URLs for all sizes
 */
export function generateImageUrls(publicId: string): ProcessedImageUrls {
  const original = cloudinary.url(publicId, {
    quality: 'auto:good',
    fetch_format: 'auto',
  });

  const thumbnail = cloudinary.url(publicId, {
    ...IMAGE_SIZES.thumbnail,
    quality: 'auto:good',
    fetch_format: 'auto',
  });

  const medium = cloudinary.url(publicId, {
    ...IMAGE_SIZES.medium,
    quality: 'auto:good',
    fetch_format: 'auto',
  });

  const large = cloudinary.url(publicId, {
    ...IMAGE_SIZES.large,
    quality: 'auto:good',
    fetch_format: 'auto',
  });

  return { original, thumbnail, medium, large };
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The Cloudinary public ID to delete
 * @returns Delete result
 */
export async function deleteFromCloudinary(publicId: string): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

/**
 * Validate image file
 * @param mimeType - The MIME type of the file
 * @param fileSize - The file size in bytes
 * @returns Object with valid status and optional error message
 */
export function validateImage(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE / (1024 * 1024)} ميجابايت`,
    };
  }

  return { valid: true };
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - The Cloudinary URL
 * @returns The public ID or null if not found
 */
export function extractPublicId(url: string): string | null {
  try {
    // Extract the path from URL after /upload/ or /image/upload/
    const match = url.match(/\/(?:image\/)?upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default cloudinary;
