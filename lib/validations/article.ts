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

  slug: z.union([
    z.string()
      .min(1, { message: 'رابط المقال مطلوب' })
      .max(200, { message: 'رابط المقال طويل جداً' })
      .regex(/^[a-z0-9-]+$/, { message: 'رابط المقال يجب أن يحتوي على أحرف إنجليزية صغيرة، أرقام، وشرطات فقط' }),
    z.null(),
    z.undefined(),
  ]).optional(),

  content: z.string()
    .min(1, { message: 'محتوى المقال مطلوب' }),

  excerpt: z.union([
    z.string().max(2000, { message: 'المقدمة طويلة جداً (الحد الأقصى 2000 حرف)' }),
    z.null(),
    z.undefined(),
  ]).optional(),

  featuredImageId: z.union([z.string(), z.null(), z.undefined()]).optional(),

  categoryIds: z.union([z.array(z.string()), z.null(), z.undefined()]).optional(),

  tagIds: z.union([
    z.array(z.string()).max(MAX_TAGS_PER_ARTICLE, { message: `الحد الأقصى للوسوم هو ${MAX_TAGS_PER_ARTICLE} وسوم` }),
    z.null(),
    z.undefined(),
  ]).optional(),

  status: articleStatusEnum.default('draft'),

  publishedAt: z.union([z.string().datetime(), z.null(), z.undefined()]).optional(),
  scheduledAt: z.union([z.string().datetime(), z.null(), z.undefined()]).optional(),

  metaTitle: z.union([
    z.string().max(60, { message: 'عنوان الميتا طويل جداً' }),
    z.null(),
    z.undefined(),
  ]).optional(),
  metaDescription: z.union([
    z.string().max(200, { message: 'وصف الميتا طويل جداً (الحد الأقصى 200 حرف)' }),
    z.null(),
    z.undefined(),
  ]).optional(),
  focusKeyword: z.union([z.string(), z.null(), z.undefined()]).optional(),
  conclusion: z.union([z.string(), z.null(), z.undefined()]).optional(),
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
