import { z } from 'zod';
import { isValidYouTubeUrl } from '@/lib/youtube';

/**
 * Video validation schemas
 */

// Base video schema for creation
export const createVideoSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, { message: 'رابط الفيديو مطلوب' })
    .refine(isValidYouTubeUrl, { message: 'رابط YouTube غير صالح' }),
  title: z
    .string()
    .max(200, { message: 'العنوان يجب ألا يتجاوز 200 حرف' })
    .optional()
    .nullable(),
  privacyMode: z.boolean().default(false),
  autoplay: z.boolean().default(false),
  startTime: z
    .number()
    .int({ message: 'وقت البدء يجب أن يكون رقمًا صحيحًا' })
    .min(0, { message: 'وقت البدء يجب أن يكون صفرًا أو أكثر' })
    .default(0),
  position: z
    .number()
    .int({ message: 'الترتيب يجب أن يكون رقمًا صحيحًا' })
    .min(0, { message: 'الترتيب يجب أن يكون صفرًا أو أكثر' })
    .default(0),
  articleId: z
    .string()
    .min(1, { message: 'معرف المقال مطلوب' }),
});

// Update video schema - all fields optional except id
export const updateVideoSchema = z.object({
  title: z
    .string()
    .max(200, { message: 'العنوان يجب ألا يتجاوز 200 حرف' })
    .optional()
    .nullable(),
  privacyMode: z.boolean().optional(),
  autoplay: z.boolean().optional(),
  startTime: z
    .number()
    .int({ message: 'وقت البدء يجب أن يكون رقمًا صحيحًا' })
    .min(0, { message: 'وقت البدء يجب أن يكون صفرًا أو أكثر' })
    .optional(),
  position: z
    .number()
    .int({ message: 'الترتيب يجب أن يكون رقمًا صحيحًا' })
    .min(0, { message: 'الترتيب يجب أن يكون صفرًا أو أكثر' })
    .optional(),
});

// Schema for bulk video operations
export const bulkVideoSchema = z.object({
  videoIds: z
    .array(z.string().min(1))
    .min(1, { message: 'يجب اختيار فيديو واحد على الأقل' }),
});

// Schema for linking video to article
export const linkVideoToArticleSchema = z.object({
  videoId: z.string().min(1, { message: 'معرف الفيديو مطلوب' }),
  articleId: z.string().min(1, { message: 'معرف المقال مطلوب' }),
  position: z.number().int().min(0).default(0),
});

// Schema for video embed options (used in editor)
export const videoEmbedOptionsSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, { message: 'رابط الفيديو مطلوب' })
    .refine(isValidYouTubeUrl, { message: 'رابط YouTube غير صالح' }),
  title: z.string().optional().nullable(),
  privacyMode: z.boolean().default(false),
  autoplay: z.boolean().default(false),
  startTime: z.number().min(0).default(0),
  showRelated: z.boolean().default(false),
});

// Type exports
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type BulkVideoInput = z.infer<typeof bulkVideoSchema>;
export type LinkVideoToArticleInput = z.infer<typeof linkVideoToArticleSchema>;
export type VideoEmbedOptions = z.infer<typeof videoEmbedOptionsSchema>;
