import { prisma } from './prisma';

/**
 * Login Attempt Throttling Configuration
 */
const THROTTLE_CONFIG = {
  MAX_ATTEMPTS: 5,           // Maximum failed attempts before lockout
  LOCKOUT_DURATION: 15 * 60 * 1000,  // 15 minutes in milliseconds
  WINDOW_DURATION: 15 * 60 * 1000,   // 15 minutes - time window to count attempts
} as const;

/**
 * Throttling result
 */
export interface ThrottleCheck {
  allowed: boolean;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  error?: string;
}

/**
 * Check if login attempts should be throttled for an identifier
 *
 * @param identifier - Email address or IP address
 * @returns ThrottleCheck result with allowed status and error details
 */
export async function checkLoginThrottle(identifier: string): Promise<ThrottleCheck> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - THROTTLE_CONFIG.WINDOW_DURATION);

  // Count recent failed attempts in the time window
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      identifier,
      success: false,
      attemptedAt: {
        gte: windowStart,
      },
    },
  });

  // Check if already locked out
  const lastFailure = await prisma.loginAttempt.findFirst({
    where: {
      identifier,
      success: false,
    },
    orderBy: {
      attemptedAt: 'desc',
    },
  });

  // If locked out, check if lockout has expired
  if (lastFailure && recentFailures >= THROTTLE_CONFIG.MAX_ATTEMPTS) {
    const lockoutUntil = new Date(lastFailure.attemptedAt.getTime() + THROTTLE_CONFIG.LOCKOUT_DURATION);

    if (lockoutUntil > now) {
      return {
        allowed: false,
        lockoutUntil,
        error: `تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة مرة أخرى بعد ${formatTimeRemaining(lockoutUntil, now)}`,
      };
    }
  }

  // Calculate remaining attempts
  const remainingAttempts = Math.max(0, THROTTLE_CONFIG.MAX_ATTEMPTS - recentFailures);

  return {
    allowed: true,
    remainingAttempts,
  };
}

/**
 * Record a login attempt (success or failure)
 *
 * @param identifier - Email address or IP address
 * @param success - Whether the login attempt was successful
 * @param ip - Optional IP address for additional tracking
 */
export async function recordLoginAttempt(
  identifier: string,
  success: boolean,
  ip?: string
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      identifier,
      success,
      ip,
    },
  });

  // Clean up old successful login attempts (keep only failed ones)
  if (success) {
    const oldDate = new Date(Date.now() - THROTTLE_CONFIG.WINDOW_DURATION * 2);
    await prisma.loginAttempt.deleteMany({
      where: {
        identifier,
        success: true,
        attemptedAt: {
          lt: oldDate,
        },
      },
    });
  }
}

/**
 * Reset login attempts for an identifier (call after successful login)
 *
 * @param identifier - Email address or IP address
 */
export async function resetLoginAttempts(identifier: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: {
      identifier,
    },
  });
}

/**
 * Get client IP address from request headers
 *
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIp(request: Request): string {
  // Check various headers for IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Format remaining time until lockout expires (in Arabic)
 *
 * @param lockoutUntil - Date when lockout expires
 * @param now - Current date
 * @returns Formatted time string in Arabic
 */
function formatTimeRemaining(lockoutUntil: Date, now: Date): string {
  const diffMs = lockoutUntil.getTime() - now.getTime();
  const diffMins = Math.ceil(diffMs / (60 * 1000));

  if (diffMins < 1) {
    return 'أقل من دقيقة';
  }

  if (diffMins === 1) {
    return 'دقيقة واحدة';
  }

  if (diffMins === 2) {
    return 'دقيقتين';
  }

  if (diffMins <= 10) {
    return `${diffMins} دقائق`;
  }

  return `${diffMins} دقيقة`;
}
