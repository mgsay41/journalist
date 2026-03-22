import { z } from 'zod';

/**
 * Settings validation schemas using Zod v4
 */

// General Settings Schema
export const generalSettingsSchema = z.object({
  siteName: z
    .string()
    .min(1, { message: 'اسم الموقع مطلوب' })
    .max(100, { message: 'اسم الموقع يجب أن لا يتجاوز 100 حرف' }),
  siteTagline: z
    .string()
    .max(200, { message: 'الشعار يجب أن لا يتجاوز 200 حرف' })
    .optional()
    .nullable(),
  adminEmail: z
    .string()
    .email({ message: 'البريد الإلكتروني غير صالح' })
    .optional()
    .nullable(),
  timezone: z
    .string()
    .min(1, { message: 'المنطقة الزمنية مطلوبة' }),
  dateFormat: z
    .string()
    .min(1, { message: 'تنسيق التاريخ مطلوب' }),
  timeFormat: z
    .enum(['12', '24'], { message: 'تنسيق الوقت يجب أن يكون 12 أو 24' }),
});

// Profile Settings Schema
export const profileSettingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'الاسم مطلوب' })
    .max(100, { message: 'الاسم يجب أن لا يتجاوز 100 حرف' }),
  email: z
    .string()
    .email({ message: 'البريد الإلكتروني غير صالح' }),
  image: z
    .string()
    .url({ message: 'رابط الصورة غير صالح' })
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, { message: 'النبذة يجب أن لا تتجاوز 500 حرف' })
    .optional()
    .nullable(),
  authorTitle: z
    .string()
    .max(100, { message: 'المسمى الوظيفي يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  twitterUrl: z
    .string()
    .url({ message: 'رابط تويتر غير صالح' })
    .optional()
    .nullable(),
  linkedinUrl: z
    .string()
    .url({ message: 'رابط لينكدإن غير صالح' })
    .optional()
    .nullable(),
});

// Password Change Schema
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: 'كلمة المرور الحالية مطلوبة' }),
  newPassword: z
    .string()
    .min(8, { message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' })
    .regex(/[A-Z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' })
    .regex(/[a-z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' })
    .regex(/[0-9]/, { message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' }),
  confirmPassword: z
    .string()
    .min(1, { message: 'تأكيد كلمة المرور مطلوب' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

// SEO Settings Schema
export const seoSettingsSchema = z.object({
  defaultMetaTitle: z
    .string()
    .max(60, { message: 'عنوان الصفحة الافتراضي يجب أن لا يتجاوز 60 حرف' })
    .optional()
    .nullable(),
  defaultMetaDescription: z
    .string()
    .max(160, { message: 'وصف الصفحة الافتراضي يجب أن لا يتجاوز 160 حرف' })
    .optional()
    .nullable(),
  siteKeywords: z
    .string()
    .max(500, { message: 'الكلمات المفتاحية يجب أن لا تتجاوز 500 حرف' })
    .optional()
    .nullable(),
  googleAnalyticsId: z
    .string()
    .max(50, { message: 'معرف Google Analytics يجب أن لا يتجاوز 50 حرف' })
    .optional()
    .nullable(),
  googleSearchConsole: z
    .string()
    .max(100, { message: 'رمز التحقق يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  facebookHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  twitterHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  instagramHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  youtubeHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
});

// Media Settings Schema
export const mediaSettingsSchema = z.object({
  maxUploadSize: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(1, { message: 'الحد الأقصى لحجم الملف يجب أن يكون 1 ميجابايت على الأقل' })
    .max(100, { message: 'الحد الأقصى لحجم الملف يجب أن لا يتجاوز 100 ميجابايت' }),
  imageQuality: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(1, { message: 'جودة الصورة يجب أن تكون بين 1 و 100' })
    .max(100, { message: 'جودة الصورة يجب أن تكون بين 1 و 100' }),
  storageProvider: z
    .enum(['cloudinary', 'vercel-blob'], { message: 'موفر التخزين يجب أن يكون cloudinary أو vercel-blob' }),
});

// Publishing Settings Schema
export const publishingSettingsSchema = z.object({
  defaultArticleStatus: z
    .enum(['draft', 'published'], { message: 'الحالة الافتراضية يجب أن تكون مسودة أو منشورة' }),
  autoPublishEnabled: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' }),
  defaultCategories: z
    .string()
    .optional()
    .nullable(), // JSON array of category IDs
  notifyOnPublish: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' }),
});

// AI Settings Schema
export const aiSettingsSchema = z.object({
  aiModelPreference: z
    .enum(['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'], {
      message: 'النموذج يجب أن يكون من نماذج Gemini المتاحة'
    }),
  aiResponseLimit: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(256, { message: 'الحد الأقصى للرد يجب أن يكون 256 رمز على الأقل' })
    .max(8192, { message: 'الحد الأقصى للرد يجب أن لا يتجاوز 8192 رمز' }),
  aiFeaturesEnabled: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' }),
});

// Combined Settings Schema (for full update)
export const updateSettingsSchema = z.object({
  // General
  siteName: z
    .string()
    .min(1, { message: 'اسم الموقع مطلوب' })
    .max(100, { message: 'اسم الموقع يجب أن لا يتجاوز 100 حرف' })
    .optional(),
  siteTagline: z
    .string()
    .max(200, { message: 'الشعار يجب أن لا يتجاوز 200 حرف' })
    .optional()
    .nullable(),
  adminEmail: z
    .string()
    .email({ message: 'البريد الإلكتروني غير صالح' })
    .optional()
    .nullable(),
  timezone: z
    .string()
    .min(1, { message: 'المنطقة الزمنية مطلوبة' })
    .optional(),
  dateFormat: z
    .string()
    .min(1, { message: 'تنسيق التاريخ مطلوب' })
    .optional(),
  timeFormat: z
    .enum(['12', '24'], { message: 'تنسيق الوقت يجب أن يكون 12 أو 24' })
    .optional(),

  // SEO
  defaultMetaTitle: z
    .string()
    .max(60, { message: 'عنوان الصفحة الافتراضي يجب أن لا يتجاوز 60 حرف' })
    .optional()
    .nullable(),
  defaultMetaDescription: z
    .string()
    .max(160, { message: 'وصف الصفحة الافتراضي يجب أن لا يتجاوز 160 حرف' })
    .optional()
    .nullable(),
  siteKeywords: z
    .string()
    .max(500, { message: 'الكلمات المفتاحية يجب أن لا تتجاوز 500 حرف' })
    .optional()
    .nullable(),
  googleAnalyticsId: z
    .string()
    .max(50, { message: 'معرف Google Analytics يجب أن لا يتجاوز 50 حرف' })
    .optional()
    .nullable(),
  googleSearchConsole: z
    .string()
    .max(100, { message: 'رمز التحقق يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  facebookHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  twitterHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  instagramHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),
  youtubeHandle: z
    .string()
    .max(100, { message: 'اسم المستخدم يجب أن لا يتجاوز 100 حرف' })
    .optional()
    .nullable(),

  // Media
  maxUploadSize: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(1, { message: 'الحد الأقصى لحجم الملف يجب أن يكون 1 ميجابايت على الأقل' })
    .max(100, { message: 'الحد الأقصى لحجم الملف يجب أن لا يتجاوز 100 ميجابايت' })
    .optional(),
  imageQuality: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(1, { message: 'جودة الصورة يجب أن تكون بين 1 و 100' })
    .max(100, { message: 'جودة الصورة يجب أن تكون بين 1 و 100' })
    .optional(),
  storageProvider: z
    .enum(['cloudinary', 'vercel-blob'], { message: 'موفر التخزين يجب أن يكون cloudinary أو vercel-blob' })
    .optional(),

  // Publishing
  defaultArticleStatus: z
    .enum(['draft', 'published'], { message: 'الحالة الافتراضية يجب أن تكون مسودة أو منشورة' })
    .optional(),
  autoPublishEnabled: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' })
    .optional(),
  defaultCategories: z
    .string()
    .optional()
    .nullable(),
  notifyOnPublish: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' })
    .optional(),

  // AI
  aiModelPreference: z
    .enum(['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'], {
      message: 'النموذج يجب أن يكون من نماذج Gemini المتاحة'
    })
    .optional(),
  aiResponseLimit: z
    .number()
    .int({ message: 'يجب أن يكون رقمًا صحيحًا' })
    .min(256, { message: 'الحد الأقصى للرد يجب أن يكون 256 رمز على الأقل' })
    .max(8192, { message: 'الحد الأقصى للرد يجب أن لا يتجاوز 8192 رمز' })
    .optional(),
  aiFeaturesEnabled: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' })
    .optional(),

  // Breaking News
  breakingNewsEnabled: z
    .boolean({ message: 'يجب أن تكون قيمة منطقية' })
    .optional(),
  breakingNewsText: z
    .string()
    .max(300, { message: 'نص الخبر العاجل يجب أن لا يتجاوز 300 حرف' })
    .optional()
    .nullable(),
  breakingNewsUrl: z
    .string()
    .url({ message: 'رابط الخبر العاجل غير صالح' })
    .optional()
    .nullable(),
});

// Type exports
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type SeoSettingsInput = z.infer<typeof seoSettingsSchema>;
export type MediaSettingsInput = z.infer<typeof mediaSettingsSchema>;
export type PublishingSettingsInput = z.infer<typeof publishingSettingsSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
