import { z } from 'zod';

/**
 * Article validation schemas using Zod
 */

// Maximum number of tags allowed per article
export const MAX_TAGS_PER_ARTICLE = 10;

export const articleStatusEnum = z.enum(['draft', 'published', 'scheduled', 'archived'], {
  message: 'حالة المقال غير صالحة',
});

export const createArticleSchema = z.object({
  title: z.string()
    .min(1, { message: 'عنوان المقال مطلوب' })
    .max(200, { message: 'عنوان المقال طويل جداً (الحد الأقصى 200 حرف)' }),

  slug: z.string()
    .min(1, { message: 'رابط المقال مطلوب' })
    .max(200, { message: 'رابط المقال طويل جداً' })
    .regex(/^[a-z0-9-]+$/, { message: 'رابط المقال يجب أن يحتوي على أحرف إنجليزية صغيرة، أرقام، وشرطات فقط' })
    .nullish(),

  content: z.string()
    .min(1, { message: 'محتوى المقال مطلوب' }),

  excerpt: z.string()
    .max(500, { message: 'المقدمة طويلة جداً (الحد الأقصى 500 حرف)' })
    .nullish(),

  featuredImageId: z.string().nullish(),

  categoryIds: z.array(z.string()).nullish(),

  tagIds: z.array(z.string())
    .max(MAX_TAGS_PER_ARTICLE, { message: `الحد الأقصى للوسوم هو ${MAX_TAGS_PER_ARTICLE} وسوم` })
    .nullish(),

  status: articleStatusEnum.default('draft'),

  publishedAt: z.string().datetime().nullish(),
  scheduledAt: z.string().datetime().nullish(),

  metaTitle: z.string()
    .max(60, { message: 'عنوان الميتا طويل جداً' })
    .nullish(),
  metaDescription: z.string()
    .max(160, { message: 'وصف الميتا طويل جداً' })
    .nullish(),
  focusKeyword: z.string().nullish(),
});

export const updateArticleSchema = createArticleSchema.partial().extend({
  id: z.string().min(1, { message: 'معرف المقال مطلوب' }),
});

export const deleteArticleSchema = z.object({
  id: z.string().min(1, { message: 'معرف المقال مطلوب' }),
  permanent: z.boolean().default(false),
});

export const listArticlesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: articleStatusEnum.optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type DeleteArticleInput = z.infer<typeof deleteArticleSchema>;
export type ListArticlesInput = z.infer<typeof listArticlesSchema>;
