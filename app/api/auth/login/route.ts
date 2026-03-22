import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  isAccountLocked,
  isIpLocked,
  recordFailedLogin,
  clearFailedLoginAttempts,
  getLockoutStatus,
  getLockoutErrorMessage,
} from '@/lib/security/auth-protection';
import { withErrorHandler } from '@/lib/errors/handler';
import { isValidEmail } from '@/lib/security/validation';

/**
 * POST /api/auth/login
 *
 * Authenticate admin user and create session using Better Auth
 * Phase 1 Backend Audit - Enhanced with account lockout, IP protection, and error handling
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password, remember } = body;

  // Get client IP for security
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Validate input
  if (!email || !password) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني غير صالح' },
      { status: 400 }
    );
  }

  // Check account and IP lockout status
  const lockoutStatus = await getLockoutStatus(email, ip);

  if (lockoutStatus.accountLocked || lockoutStatus.ipLocked) {
    return NextResponse.json(
      {
        error: getLockoutErrorMessage(lockoutStatus),
        locked: true,
        unlockTime: lockoutStatus.accountUnlockTime || lockoutStatus.ipUnlockTime,
      },
      { status: 429 }
    );
  }

  // Try to sign in using Better Auth
  // Better Auth throws on bad credentials — catch to record the failed attempt
  let authResult: { session?: { token?: string }; token?: string; user?: { id: string; email: string; name: string } };
  try {
    authResult = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: request.headers,
    }) as typeof authResult;
  } catch {
    await recordFailedLogin(email, ip);
    const updatedStatus = await getLockoutStatus(email, ip);
    return NextResponse.json(
      {
        error: updatedStatus.accountLocked || updatedStatus.ipLocked
          ? getLockoutErrorMessage(updatedStatus)
          : 'بيانات الاعتماد غير صحيحة',
        locked: updatedStatus.accountLocked || updatedStatus.ipLocked,
        unlockTime: updatedStatus.accountUnlockTime || updatedStatus.ipUnlockTime,
      },
      { status: 401 }
    );
  }

  const sessionToken = authResult.session?.token || authResult.token;
  const userData = authResult.user;

  // Clear failed login attempts on successful login
  await clearFailedLoginAttempts(email);

  // Create response
  const response = NextResponse.json({
    success: true,
    user: userData,
  });

  // Set the session cookie manually
  // Using underscore in name to avoid encoding issues with dots
  if (sessionToken) {
    response.cookies.set('better_auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * (remember ? 30 : 7), // 30 days if remember, else 7 days
      path: '/',
    });
  }

  return response;
});
