import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/cloudinary';

// Image upload validation schema
export const imageUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => ALLOWED_IMAGE_TYPES.includes(file.type),
    { message: 'نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, GIF, WebP' }
  ).refine(
    (file) => file.size <= MAX_FILE_SIZE,
    { message: `حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE / (1024 * 1024)} ميجابايت` }
  ),
});

// Image metadata update schema
export const imageUpdateSchema = z.object({
  altText: z.string().max(500, { message: 'النص البديل طويل جداً (الحد الأقصى 500 حرف)' }).optional(),
  caption: z.string().max(1000, { message: 'التعليق طويل جداً (الحد الأقصى 1000 حرف)' }).optional(),
});

// Image query parameters schema
export const imageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['uploadedAt', 'filename', 'fileSize']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  unused: z.coerce.boolean().optional(), // Filter for images not used in any article
});

// Image delete schema (for bulk delete)
export const imageDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, { message: 'يجب تحديد صورة واحدة على الأقل' }),
});

// Type exports
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type ImageUpdateInput = z.infer<typeof imageUpdateSchema>;
export type ImageQueryInput = z.infer<typeof imageQuerySchema>;
export type ImageDeleteInput = z.infer<typeof imageDeleteSchema>;
