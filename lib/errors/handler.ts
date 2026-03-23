/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across all API endpoints:
 * - Sanitizes error messages to prevent information disclosure
 * - Logs errors for debugging (without exposing internals)
 * - Provides standardized error responses
 * - Distinguishes between operational and unexpected errors
 *
 * Phase 1 Backend Audit - Critical Security Fix
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { logError as rollbarLogError, isRollbarConfigured } from '@/lib/rollbar/server';

/**
 * HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  // Validation errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_URL = 'INVALID_URL',
  INVALID_FILE = 'INVALID_FILE',

  // Authentication errors (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  IP_LOCKED = 'IP_LOCKED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (4xx)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Resource errors (4xx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Rate limiting (4xx)
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Arabic error messages for each error code
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: 'بيانات غير صالحة',
  [ErrorCode.INVALID_INPUT]: 'إدخال غير صالح',
  [ErrorCode.MISSING_FIELD]: 'حقل مطلوب مفقود',
  [ErrorCode.INVALID_FORMAT]: 'تنسيق غير صالح',
  [ErrorCode.INVALID_EMAIL]: 'البريد الإلكتروني غير صالح',
  [ErrorCode.INVALID_URL]: 'عنوان URL غير صالح',
  [ErrorCode.INVALID_FILE]: 'ملف غير صالح',

  [ErrorCode.UNAUTHORIZED]: 'غير مصرح - يرجى تسجيل الدخول',
  [ErrorCode.INVALID_CREDENTIALS]: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  [ErrorCode.ACCOUNT_LOCKED]: 'الحساب مؤمن مؤقتاً',
  [ErrorCode.IP_LOCKED]: 'عنوان IP مؤمن مؤقتاً',
  [ErrorCode.SESSION_EXPIRED]: 'انتهت صلاحية الدخول',

  [ErrorCode.FORBIDDEN]: 'ممنوع - ليس لديك صلاحية كافية',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'صلاحيات غير كافية',

  [ErrorCode.NOT_FOUND]: 'غير موجود',
  [ErrorCode.ALREADY_EXISTS]: 'موجود بالفعل',
  [ErrorCode.CONFLICT]: 'يوجد تضارب في البيانات',
  [ErrorCode.RESOURCE_LOCKED]: 'المورد مؤمن',

  [ErrorCode.RATE_LIMITED]: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً',

  [ErrorCode.INTERNAL_ERROR]: 'حدث خطأ غير متوقع',
  [ErrorCode.DATABASE_ERROR]: 'خطأ في النظام',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'خطأ في خدمة خارجية',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'الخدمة غير متوفرة حالياً',
};

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message?: string,
    public isOperational = true,
    public details?: Record<string, unknown>
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error
   */
  static validation(message?: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, ErrorCode.VALIDATION_ERROR, message, true, details);
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message?: string): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message?: string): ApiError {
    return new ApiError(403, ErrorCode.FORBIDDEN, message);
  }

  /**
   * Create a not found error
   */
  static notFound(resource?: string): ApiError {
    const message = resource ? `${resource} غير موجود` : ERROR_MESSAGES[ErrorCode.NOT_FOUND];
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }

  /**
   * Create a conflict error
   */
  static conflict(message?: string): ApiError {
    return new ApiError(409, ErrorCode.CONFLICT, message);
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(retryAfter?: number): ApiError {
    const error = new ApiError(429, ErrorCode.RATE_LIMITED);
    if (retryAfter) {
      error.details = { retryAfter };
    }
    return error;
  }

  /**
   * Create an internal server error
   */
  static internal(message?: string): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL_ERROR, message, false);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Convert an error to an ApiError if possible
 *
 * @param error - Any error
 * @returns ApiError instance
 */
function convertToApiError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return ApiError.validation(
      error.issues[0]?.message || ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR],
      { issues: error.issues }
    );
  }

  // Error with status property (Next.js error)
  if (error && typeof error === 'object' && 'status' in error) {
    const statusCode = (error as { status: number }).status;
    if (statusCode === 401) {
      return new ApiError(401, ErrorCode.UNAUTHORIZED);
    }
    if (statusCode === 403) {
      return new ApiError(403, ErrorCode.FORBIDDEN);
    }
    if (statusCode === 404) {
      return new ApiError(404, ErrorCode.NOT_FOUND);
    }
  }

  // Generic error - don't expose details
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Unexpected error', { message, error });

  return ApiError.internal();
}

/**
 * Handle an error and return an appropriate response
 *
 * @param error - Any error
 * @param requestId - Optional request ID for tracing
 * @returns NextResponse with error details
 */
export function handleError(error: unknown, requestId?: string): NextResponse<ErrorResponse> {
  // Convert to ApiError
  const apiError = convertToApiError(error);

  // Create error response
  const errorResponse: ErrorResponse = {
    error: apiError.message,
    code: apiError.code,
    statusCode: apiError.statusCode,
    requestId,
  };

  // Include details only for operational errors
  if (apiError.isOperational && apiError.details) {
    errorResponse.details = apiError.details;
  }

  // Log non-operational errors for monitoring
  if (!apiError.isOperational) {
    logger.error('Unhandled error', {
      code: apiError.code,
      message: apiError.message,
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Report to Rollbar if configured
    if (isRollbarConfigured()) {
      rollbarLogError(error instanceof Error ? error : new Error(String(error)), {
        code: apiError.code,
        requestId,
      });
    }
  }

  // Return response with appropriate status code
  return NextResponse.json(errorResponse, { status: apiError.statusCode });
}

/**
 * Wrapper for async route handlers with automatic error handling
 *
 * @param handler - Async route handler
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Try to extract request ID from first argument (if it's a NextRequest)
      const request = args[0] as Request & { headers?: { get: (name: string) => string | null } };
      const requestId = request?.headers?.get('x-request-id') || undefined;

      return handleError(error, requestId);
    }
  };
}

/**
 * Try-catch wrapper for synchronous operations
 *
 * @param fn - Function to execute
 * @returns Result or error
 */
export function tryCatch<T, E extends Error = Error>(
  fn: () => T
): { success: true; data: T } | { success: false; error: E } {
  try {
    return { success: true, data: fn() };
  } catch (error) {
    return { success: false, error: error as E };
  }
}

/**
 * Try-catch wrapper for async operations
 *
 * @param fn - Async function to execute
 * @returns Result or error
 */
export async function tryCatchAsync<T, E extends Error = Error>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: E }> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    return { success: false, error: error as E };
  }
}

/**
 * Safe JSON parse that won't throw
 *
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate environment variable
 *
 * @param key - Environment variable key
 * @param required - Whether the variable is required
 * @returns Environment variable value or throws error
 */
export function getEnvVar(key: string, required = true): string {
  const value = process.env[key];

  if (required && !value) {
    throw ApiError.internal(`Environment variable ${key} is not configured`);
  }

  return value || '';
}

/**
 * Lightweight helper for simple `{ error }` responses.
 * Keeps all API routes returning a consistent shape without requiring
 * full ApiError plumbing for every inline check.
 *
 * Usage: return errorResponse('غير مصرح', 401);
 */
export function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<{ error: string; details?: Record<string, unknown> }> {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

/**
 * Validate required environment variables
 *
 * @param keys - Array of environment variable keys
 * @throws ApiError if any required variable is missing
 */
export function validateEnvVars(keys: string[]): void {
  const missing: string[] = [];

  for (const key of keys) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw ApiError.internal(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
