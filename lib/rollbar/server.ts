/**
 * Rollbar Server-Side Configuration
 *
 * Phase 5 Backend Audit - Error Tracking with Rollbar
 *
 * Provides server-side error tracking and logging for:
 * - API route errors
 * - Server component errors
 * - Database operation failures
 * - External API call failures
 *
 * Environment Variables Required:
 * - ROLLBAR_ACCESS_TOKEN: Server-side access token (post_server_item)
 * - NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN: Client-side access token (client)
 * - ROLLBAR_ENVIRONMENT: Environment name (production, staging, development)
 *
 * Rollbar Documentation: https://docs.rollbar.com/docs/getting-started
 */

import Rollbar from 'rollbar';

// ============================================================================
// PLACEHOLDER: Paste your Rollbar access token below
// ============================================================================
// Get your access token from: https://rollbar.com/<your-project>/settings/access-tokens/
// You need a "post_server_item" token for server-side
const ROLLBAR_ACCESS_TOKEN = process.env.ROLLBAR_ACCESS_TOKEN || 'PASTE_YOUR_ROLLBAR_ACCESS_TOKEN_HERE';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Create Rollbar instance for server-side error tracking
 */
export const rollbar = new Rollbar({
  accessToken: ROLLBAR_ACCESS_TOKEN,
  environment: process.env.ROLLBAR_ENVIRONMENT || process.env.NODE_ENV || 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
  hostSafeList: ['rollbar.com', 'your-domain.com'], // Add your domain

  // Sensitive data filtering - redact before sending to Rollbar
  scrubFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
    'csrf',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
    'email',
  ],

  // Request body filtering
  scrubHeaders: ['authorization', 'cookie'],

  // Only send errors in production (or when explicitly enabled)
  enabled: process.env.NODE_ENV === 'production' || process.env.ROLLBAR_ENABLED === 'true',

  // Verbosity
  verbose: false,

  // Code version for release tracking
  codeVersion: process.env.VERCEL_GIT_COMMIT_SHA || process.env.HEROKU_SLUG_COMMIT || 'development',

  // Transform function to add custom data
  transform(err, args) {
    // Add custom metadata to all errors
    if (args.request) {
      const argsObj = args as Record<string, unknown>;
      argsObj.custom = (argsObj.custom as Record<string, unknown>) || {};
      (argsObj.custom as Record<string, unknown>).app = 'journalist-cms';
      (argsObj.custom as Record<string, unknown>).nodeVersion = process.version;
    }
  },

  // Filter out specific errors
  checkIgnore(err) {
    // Ignore 404 errors for certain routes
    const errObj = (err as unknown) as { message?: string };
    if (errObj?.message?.includes('Cannot find module')) {
      // Only ignore if it's a node_modules issue
      return false;
    }
    return false;
  },
});

/**
 * Log levels for structured logging
 */
export type LogLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Log a message with context
 */
export function logMessage(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  rollbar[level === 'critical' ? 'critical' : level](message, data);
}

/**
 * Log an error with context
 */
export function logError(err: Error | unknown, context?: Record<string, unknown>): void {
  if (err instanceof Error) {
    rollbar.error(err.message, err, {
      ...context,
      custom: {
        ...context,
        stack: err.stack,
      },
    });
  } else {
    rollbar.error(String(err), context);
  }
}

/**
 * Log a critical error (highest priority)
 */
export function logCritical(message: string, err?: Error, context?: Record<string, unknown>): void {
  if (err) {
    rollbar.critical(message, err, context);
  } else {
    rollbar.critical(message, context);
  }
}

/**
 * Log a warning
 */
export function logWarning(message: string, context?: Record<string, unknown>): void {
  rollbar.warning(message, context);
}

/**
 * Log info
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  rollbar.info(message, context);
}

/**
 * Log debug (only in development or if enabled)
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development' || process.env.ROLLBAR_DEBUG === 'true') {
    rollbar.debug(message, context);
  }
}

/**
 * Set user context for error tracking
 */
export function setRollbarUser(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}): void {
  rollbar.configure({
    payload: {
      person: {
        id: user.id,
        email: user.email ? '[REDACTED]' : undefined, // Redact email for privacy
        username: user.username,
      },
    },
  });
}

/**
 * Clear user context (on logout)
 */
export function clearRollbarUser(): void {
  rollbar.configure({ payload: { person: undefined } });
}

/**
 * Add custom data to all future error reports
 */
export function addRollbarData(data: Record<string, unknown>): void {
  rollbar.configure({ payload: { custom: data } });
}

/**
 * Create a Rollbar-aware logger wrapper
 */
export class RollbarLogger {
  private context?: Record<string, unknown>;

  constructor(context?: Record<string, unknown>) {
    this.context = context;
  }

  critical(message: string, err?: Error, extraContext?: Record<string, unknown>): void {
    logCritical(message, err, { ...this.context, ...extraContext });
  }

  error(message: string, err?: Error, extraContext?: Record<string, unknown>): void {
    if (err) {
      logError(err, { message, ...this.context, ...extraContext });
    } else {
      logMessage('error', message, { ...this.context, ...extraContext });
    }
  }

  warning(message: string, context?: Record<string, unknown>): void {
    logWarning(message, { ...this.context, ...context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    logInfo(message, { ...this.context, ...context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    logDebug(message, { ...this.context, ...context });
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: Record<string, unknown>): RollbarLogger {
    return new RollbarLogger({ ...this.context, ...childContext });
  }
}

/**
 * Create a logger from a request context
 */
export function createLoggerFromRequest(request: {
  headers?: { get: (name: string) => string | null };
  url?: string;
  method?: string;
}): RollbarLogger {
  const requestId = request?.headers?.get('x-request-id') || undefined;
  const userId = request?.headers?.get('x-user-id') || undefined;

  return new RollbarLogger({
    requestId,
    userId,
    method: request?.method,
    url: request?.url,
  });
}

/**
 * Check if Rollbar is properly configured
 */
export function isRollbarConfigured(): boolean {
  return !!(
    process.env.ROLLBAR_ACCESS_TOKEN &&
    process.env.ROLLBAR_ACCESS_TOKEN !== 'PASTE_YOUR_ROLLBAR_ACCESS_TOKEN_HERE'
  );
}

/**
 * Default logger instance
 */
export const logger = new RollbarLogger();
