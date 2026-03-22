/**
 * Authentication Protection Module
 *
 * Provides brute force protection through:
 * - Account lockout after failed login attempts
 * - IP-based lockout for repeated failures
 * - Attempt tracking with expiration
 *
 * Phase 1 Backend Audit - Critical Security Fix
 */

import { prisma } from '@/lib/prisma';

/**
 * Configuration for account lockout
 */
const ACCOUNT_LOCKOUT_CONFIG = {
  /** Maximum failed attempts before account lockout */
  MAX_ATTEMPTS: 5,
  /** Lockout duration in milliseconds (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  /** Attempt tracking window in milliseconds (30 minutes) */
  ATTEMPT_WINDOW_MS: 30 * 60 * 1000,
} as const;

/**
 * Configuration for IP-based lockout
 */
const IP_LOCKOUT_CONFIG = {
  /** Maximum failed attempts from an IP */
  MAX_IP_ATTEMPTS: 10,
  /** IP lockout duration in milliseconds (1 hour) */
  LOCKOUT_DURATION_MS: 60 * 60 * 1000,
  /** Attempt tracking window in milliseconds (1 hour) */
  ATTEMPT_WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * Login attempt entry for in-memory tracking
 */
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory store for IP-based tracking (fallback)
// Note: In production, use Redis for distributed systems
const ipAttemptStore = new Map<string, LoginAttempt>();

/**
 * Clean up expired entries from the IP attempt store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of ipAttemptStore.entries()) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      // Reset after lockout expires
      entry.count = 0;
      entry.lockedUntil = undefined;
    } else if (entry.lastAttempt + IP_LOCKOUT_CONFIG.ATTEMPT_WINDOW_MS < now) {
      // Expired entry
      ipAttemptStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check if an email is currently locked out due to failed login attempts
 *
 * @param email - Email address to check
 * @returns Object with locked status and unlock time
 */
export async function isAccountLocked(email: string): Promise<{
  locked: boolean;
  unlockTime?: Date;
  remainingTime?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      lockedUntil: true,
      failedLoginAttempts: true,
    },
  });

  if (!user) {
    return { locked: false };
  }

  // Check if account is currently locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
    return {
      locked: true,
      unlockTime: user.lockedUntil,
      remainingTime: Math.ceil(remainingMs / 1000 / 60), // Minutes
    };
  }

  // Reset attempts if lockout has expired
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  return { locked: false };
}

/**
 * Check if an IP address is locked out
 *
 * @param ipAddress - IP address to check
 * @returns Object with locked status and unlock time
 */
export function isIpLocked(ipAddress: string): {
  locked: boolean;
  unlockTime?: Date;
  remainingTime?: number;
} {
  cleanupExpiredEntries();
  const entry = ipAttemptStore.get(ipAddress);

  if (!entry) {
    return { locked: false };
  }

  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const remainingMs = entry.lockedUntil - Date.now();
    return {
      locked: true,
      unlockTime: new Date(entry.lockedUntil),
      remainingTime: Math.ceil(remainingMs / 1000 / 60), // Minutes
    };
  }

  return { locked: false };
}

/**
 * Record a failed login attempt for an email and IP
 *
 * @param email - Email address
 * @param ipAddress - IP address
 * @returns Object indicating if account/IP is now locked
 */
export async function recordFailedLogin(
  email: string,
  ipAddress: string
): Promise<{
  accountLocked: boolean;
  ipLocked: boolean;
  attemptsRemaining: number;
}> {
  // Update user's failed login attempts
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, failedLoginAttempts: true },
  });

  let accountLocked = false;
  let attemptsRemaining = 0;

  if (user) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    attemptsRemaining = Math.max(0, ACCOUNT_LOCKOUT_CONFIG.MAX_ATTEMPTS - newAttempts);

    const updateData: any = {
      failedLoginAttempts: newAttempts,
    };

    // Lock account if max attempts reached
    if (newAttempts >= ACCOUNT_LOCKOUT_CONFIG.MAX_ATTEMPTS) {
      updateData.lockedUntil = new Date(
        Date.now() + ACCOUNT_LOCKOUT_CONFIG.LOCKOUT_DURATION_MS
      );
      accountLocked = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  // Track IP attempts
  let ipLocked = false;
  const now = Date.now();
  let ipEntry = ipAttemptStore.get(ipAddress);

  if (!ipEntry || ipEntry.lastAttempt + IP_LOCKOUT_CONFIG.ATTEMPT_WINDOW_MS < now) {
    // Create new entry or reset expired
    ipEntry = {
      count: 1,
      lastAttempt: now,
    };
  } else {
    ipEntry.count++;
    ipEntry.lastAttempt = now;
  }

  // Lock IP if max attempts reached
  if (ipEntry.count >= IP_LOCKOUT_CONFIG.MAX_IP_ATTEMPTS) {
    ipEntry.lockedUntil = now + IP_LOCKOUT_CONFIG.LOCKOUT_DURATION_MS;
    ipLocked = true;
  }

  ipAttemptStore.set(ipAddress, ipEntry);

  return {
    accountLocked,
    ipLocked,
    attemptsRemaining,
  };
}

/**
 * Clear failed login attempts after successful login
 *
 * @param email - Email address
 */
export async function clearFailedLoginAttempts(email: string): Promise<void> {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Manually unlock an account (admin function)
 *
 * @param email - Email address to unlock
 * @returns True if account was unlocked
 */
export async function unlockAccount(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    return false;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return true;
}

/**
 * Get lockout status for both account and IP
 *
 * @param email - Email address
 * @param ipAddress - IP address
 * @returns Comprehensive lockout status
 */
export async function getLockoutStatus(
  email: string,
  ipAddress: string
): Promise<{
  accountLocked: boolean;
  ipLocked: boolean;
  accountUnlockTime?: Date;
  ipUnlockTime?: Date;
  attemptsRemaining?: number;
}> {
  const [accountStatus, ipStatus] = await Promise.all([
    isAccountLocked(email),
    Promise.resolve(isIpLocked(ipAddress)),
  ]);

  return {
    accountLocked: accountStatus.locked,
    ipLocked: ipStatus.locked,
    accountUnlockTime: accountStatus.unlockTime,
    ipUnlockTime: ipStatus.unlockTime,
  };
}

/**
 * Generate lockout error message in Arabic
 *
 * @param lockoutStatus - Lockout status object
 * @returns Arabic error message
 */
export function getLockoutErrorMessage(lockoutStatus: {
  accountLocked: boolean;
  ipLocked: boolean;
  accountUnlockTime?: Date;
  ipUnlockTime?: Date;
  attemptsRemaining?: number;
}): string {
  if (lockoutStatus.accountLocked && lockoutStatus.ipLocked) {
    return `تم قفل الحساب وعنوان IP مؤقتاً بسبب محاولات تسجيل دخول فاشلة. يرجى المحاولة مرة أخرى بعد ${lockoutStatus.accountUnlockTime ? Math.ceil((lockoutStatus.accountUnlockTime.getTime() - Date.now()) / 1000 / 60) : 15} دقيقة.`;
  }

  if (lockoutStatus.accountLocked) {
    return `تم قفل الحساب مؤقتاً بسبب محاولات تسجيل دخول فاشلة. يرجى المحاولة مرة أخرى بعد ${lockoutStatus.accountUnlockTime ? Math.ceil((lockoutStatus.accountUnlockTime.getTime() - Date.now()) / 1000 / 60) : 15} دقيقة.`;
  }

  if (lockoutStatus.ipLocked) {
    return `تم قفل عنوان IP مؤقتاً بسبب محاولات تسجيل دخول فاشلة. يرجى المحاولة مرة أخرى بعد ${lockoutStatus.ipUnlockTime ? Math.ceil((lockoutStatus.ipUnlockTime.getTime() - Date.now()) / 1000 / 60) : 60} دقيقة.`;
  }

  if (lockoutStatus.attemptsRemaining !== undefined && lockoutStatus.attemptsRemaining <= 2) {
    return `تحذير: بقي لديك ${lockoutStatus.attemptsRemaining} محاولة قبل قفل الحساب.`;
  }

  return '';
}
