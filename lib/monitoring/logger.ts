/**
 * Structured Logging Utility
 *
 * Provides consistent, structured logging for the application:
 * - Multiple log levels (error, warn, info, debug)
 * - Sensitive data redaction
 * - Request/response logging
 * - Performance tracking
 *
 * Phase 1 Backend Audit - Centralized Logging
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Log entry interface
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  duration?: number;
}

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
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
];

/**
 * Redact sensitive data from an object
 *
 * @param obj - Object to redact
 * @returns Object with sensitive data redacted
 */
function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Format log entry as JSON string
 */
function formatLogEntry(entry: LogEntry): string {
  const redactedEntry = {
    ...entry,
    context: entry.context ? redactSensitiveData(entry.context) : undefined,
  };

  return JSON.stringify(redactedEntry);
}

/**
 * Write log to console with appropriate level
 */
function writeLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry);

  switch (entry.level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatted);
      }
      break;
  }
}

/**
 * Logger class
 */
export class Logger {
  private requestId?: string;
  private userId?: string;
  private context?: Record<string, unknown>;

  constructor(options?: { requestId?: string; userId?: string }) {
    this.requestId = options?.requestId;
    this.userId = options?.userId;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    return new Logger({
      requestId: this.requestId,
      userId: this.userId,
    }).withContext(context);
  }

  /**
   * Add context to all future log entries
   */
  withContext(context: Record<string, unknown>): Logger {
    const logger = new Logger({
      requestId: this.requestId,
      userId: this.userId,
    });

    // Store context for future logs
    logger.context = context;

    return logger;
  }

  /**
   * Log an error
   */
  error(message: string, context?: Record<string, unknown>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: { ...this.context, ...context },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, unknown>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: { ...this.context, ...context },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Log info
   */
  info(message: string, context?: Record<string, unknown>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: { ...this.context, ...context },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context: { ...this.context, ...context },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, unknown>
  ): void {
    this.info(`${method} ${path} ${statusCode}`, {
      ...context,
      method,
      path,
      statusCode,
      duration,
    });
  }

  /**
   * Log database query
   */
  logQuery(
    operation: string,
    table: string,
    duration: number,
    context?: Record<string, unknown>
  ): void {
    this.debug(`DB Query: ${operation} on ${table}`, {
      ...context,
      operation,
      table,
      duration,
    });
  }

  /**
   * Log external API call
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Record<string, unknown>
  ): void {
    this.info(`External API: ${service} ${endpoint} ${statusCode}`, {
      ...context,
      service,
      endpoint,
      statusCode,
      duration,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(
    event: 'login' | 'logout' | 'failed_login' | 'lockout' | 'unlock',
    userId?: string,
    context?: Record<string, unknown>
  ): void {
    this.warn(`Auth: ${event}${userId ? ` for user ${userId}` : ''}`, {
      ...context,
      event,
      userId,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with request context from a NextRequest
 */
export function createLoggerFromRequest(request: Request & { headers?: { get: (name: string) => string | null } }): Logger {
  const requestId = request?.headers?.get('x-request-id') || undefined;
  const userId = request?.headers?.get('x-user-id') || undefined;

  return new Logger({ requestId, userId });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
