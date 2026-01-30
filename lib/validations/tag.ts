import { z } from 'zod';

/**
 * Tag validation schemas using Zod v4
 */

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'اسم الوسم مطلوب' })
    .max(50, { message: 'اسم الوسم يجب أن لا يتجاوز 50 حرف' }),
  slug: z
    .string()
    .max(50, { message: 'الرابط يجب أن لا يتجاوز 50 حرف' })
    .optional(),
});

export const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'اسم الوسم مطلوب' })
    .max(50, { message: 'اسم الوسم يجب أن لا يتجاوز 50 حرف' })
    .optional(),
  slug: z
    .string()
    .max(50, { message: 'الرابط يجب أن لا يتجاوز 50 حرف' })
    .optional(),
});

export const mergeTagsSchema = z.object({
  sourceTagIds: z
    .array(z.string())
    .min(1, { message: 'يجب تحديد وسم مصدر واحد على الأقل' }),
  targetTagId: z
    .string()
    .min(1, { message: 'يجب تحديد الوسم الهدف' }),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type MergeTagsInput = z.infer<typeof mergeTagsSchema>;
