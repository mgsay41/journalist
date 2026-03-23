/**
 * Rollbar Client-Side Configuration
 *
 * Phase 5 Backend Audit - Client Error Tracking with Rollbar
 *
 * Provides browser-side error tracking for:
 * - Unhandled JavaScript errors
 * - Unhandled promise rejections
 * - React component errors
 * - Network request failures
 * - User interaction errors
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN: Client-side access token (client)
 * - ROLLBAR_ENVIRONMENT: Environment name (production, staging, development)
 *
 * Usage: Wrap your root layout with RollbarProvider from this config
 *
 * Rollbar Documentation: https://docs.rollbar.com/docs/browser
 */

'use client';

import Rollbar from 'rollbar';

// ============================================================================
// PLACEHOLDER: Paste your Rollbar client access token below
// ============================================================================
// Get your access token from: https://rollbar.com/<your-project>/settings/access-tokens/
// You need a "client" token for browser-side tracking
const ROLLBAR_ACCESS_TOKEN = process.env.NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN || 'PASTE_YOUR_CLIENT_ACCESS_TOKEN_HERE';

/**
 * Create Rollbar instance for client-side error tracking
 */
export const rollbar = new Rollbar({
  accessToken: ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NEXT_PUBLIC_ROLLBAR_ENVIRONMENT || process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ROLLBAR_ENABLED === 'true',

  // Sensitive data filtering
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

  // Only send errors from your domain
  hostSafeList: [
    window.location.hostname,
    'rollbar.com',
  ],

  // Code version for release tracking
  codeVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Transform function to add custom data
  transform(err, args) {
    // Add custom metadata to all errors
    if (args.custom) {
      const custom = args.custom as Record<string, unknown>;
      custom.app = 'journalist-cms';
      custom.userAgent = navigator.userAgent;
      custom.url = window.location.href;
    }

    // Filter out errors from browser extensions
    const errObj = err as { message?: string };
    if (errObj?.message?.includes('chrome-extension://')) {
      const argsObj = args as Record<string, unknown>;
      argsObj.message = null; // Suppress extension errors
    }
  },

  // Filter out specific errors
  checkIgnore(isUncaught, args, payload) {
    // Ignore errors from browser extensions
    const payloadObj = payload as { body?: { trace?: { frames?: Array<{ filename?: string }> }; message?: { body?: string } } };
    if (payloadObj?.body?.trace?.frames?.some((frame) =>
      frame.filename?.includes('chrome-extension://') ||
      frame.filename?.includes('safari-extension://') ||
      frame.filename?.includes('moz-extension://')
    )) {
      return true;
    }

    // Ignore specific error messages
    const ignoredMessages = [
      'Script error',
      'Non-Error promise rejection captured',
    ];

    if (payloadObj?.body?.message?.body && ignoredMessages.some(msg =>
      payloadObj.body?.message?.body?.includes(msg)
    )) {
      return true;
    }

    return false;
  },

  // Add telemetry (breadcrumbs) for user actions
  autoInstrument: true,

  // Verbosity
  verbose: false,
});

/**
 * Log levels for client-side logging
 */
export type LogLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Log a message with context
 */
export function logMessage(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  rollbar[level](message, data);
}

/**
 * Log an error with context
 */
export function logError(err: Error | unknown, context?: Record<string, unknown>): void {
  if (err instanceof Error) {
    rollbar.error(err, {
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
    rollbar.critical(err, { message, ...context });
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
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ROLLBAR_DEBUG === 'true') {
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
 * Check if Rollbar is properly configured
 */
export function isRollbarConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN &&
    process.env.NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN !== 'PASTE_YOUR_CLIENT_ACCESS_TOKEN_HERE'
  );
}

/**
 * Default logger instance
 */
export const logger = new RollbarLogger();

/**
 * React Error Boundary wrapper
 * Use this to catch errors in React components
 */
export function reportReactError(error: Error, errorInfo: { componentStack: string }): void {
  rollbar.error(error, {
    componentStack: errorInfo.componentStack,
    custom: {
      react: true,
    },
  });
}

/**
 * Track user action as a breadcrumb
 */
export function trackUserAction(action: string, context?: Record<string, unknown>): void {
  rollbar.info(`User action: ${action}`, {
    ...context,
    custom: {
      breadcrumb: true,
      type: 'user',
    },
  });
}

/**
 * Track navigation as a breadcrumb
 */
export function trackNavigation(from: string, to: string): void {
  rollbar.info(`Navigation: ${from} → ${to}`, {
    custom: {
      breadcrumb: true,
      type: 'navigation',
    },
  });
}

/**
 * Track HTTP request
 */
export function trackRequest(url: string, method: string, statusCode?: number): void {
  rollbar.info(`HTTP ${method} ${url}`, {
    custom: {
      breadcrumb: true,
      type: 'http',
      statusCode,
    },
  });
}
