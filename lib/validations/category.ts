import { z } from 'zod';

/**
 * Category validation schemas using Zod v4
 */

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, { message: 'اسم التصنيف مطلوب' })
    .max(100, { message: 'اسم التصنيف يجب أن لا يتجاوز 100 حرف' }),
  slug: z
    .string()
    .max(100, { message: 'الرابط يجب أن لا يتجاوز 100 حرف' })
    .optional(),
  description: z
    .string()
    .max(500, { message: 'الوصف يجب أن لا يتجاوز 500 حرف' })
    .optional()
    .nullable(),
  parentId: z
    .string()
    .optional()
    .nullable(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, { message: 'اسم التصنيف مطلوب' })
    .max(100, { message: 'اسم التصنيف يجب أن لا يتجاوز 100 حرف' })
    .optional(),
  slug: z
    .string()
    .max(100, { message: 'الرابط يجب أن لا يتجاوز 100 حرف' })
    .optional(),
  description: z
    .string()
    .max(500, { message: 'الوصف يجب أن لا يتجاوز 500 حرف' })
    .optional()
    .nullable(),
  parentId: z
    .string()
    .optional()
    .nullable(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
