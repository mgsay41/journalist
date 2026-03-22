/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup.
 * Throws a clear error if any required variable is missing,
 * preventing cryptic runtime failures deep in the application.
 *
 * Usage: import '@/lib/env' at the top of app/layout.tsx or a server entry point.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters').optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),

  // AI (optional - features degrade gracefully)
  GEMINI_API_KEY: z.string().optional(),

  // Cloudinary (optional - required for image uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Cron security
  CRON_SECRET: z.string().optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Node env
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).refine(
  (data) => data.BETTER_AUTH_SECRET || data.NEXTAUTH_SECRET,
  { message: 'Either BETTER_AUTH_SECRET or NEXTAUTH_SECRET must be set' }
);

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `❌ Invalid environment variables:\n${missing}\n\nPlease check your .env file.`
    );
  }

  return result.data;
}

// Validate once at module load time (server-side only)
let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (typeof window !== 'undefined') {
    // Client side - return partial env with only NEXT_PUBLIC_ vars
    return process.env as unknown as Env;
  }

  if (!validatedEnv) {
    validatedEnv = validateEnv();
  }

  return validatedEnv;
}

// Auto-validate on import (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    // In development, log the error but don't crash the build
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn('[env] Warning:', (error as Error).message);
    }
  }
}
