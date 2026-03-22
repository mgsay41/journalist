import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';
import { RateLimits, checkRateLimit } from '@/lib/security/rate-limit';
import { withErrorHandler } from '@/lib/errors/handler';
import { validateRequest, isValidEmail as validateEmail } from '@/lib/security/validation';
import { validatePasswordStrength } from '@/lib/security/sanitization';

/**
 * POST /api/auth/signup
 *
 * Create the first admin user (first-time setup only)
 * Phase 1 Backend Audit - Enhanced with rate limiting and validation
 */
export const POST = withErrorHandler(async (request: Request) => {
  // Phase 1 Backend Audit: Add rate limiting (5 requests per hour)
  const rateLimitResult = await checkRateLimit(request, {
    limit: 5,
    window: 3600, // 1 hour
    identifier: 'signup',
  });

  if (rateLimitResult === null || !rateLimitResult.success) {
    const resetAt = rateLimitResult?.resetAt || Date.now() + 3600000;
    return NextResponse.json(
      {
        error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.',
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetAt).toISOString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const body = await request.json();
  const { name, email, password, confirmPassword } = body;

  // Validate email format
  if (!validateEmail(email)) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني غير صالح' },
      { status: 400 }
    );
  }

  // Validate input
  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: 'جميع الحقول مطلوبة' },
      { status: 400 }
    );
  }

  const passwordCheck = validatePasswordStrength(password);
  if (passwordCheck.strength === 'weak') {
    return NextResponse.json(
      {
        error: 'كلمة المرور ضعيفة جداً',
        feedback: passwordCheck.feedback,
      },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: 'كلمات المرور غير متطابقة' },
      { status: 400 }
    );
  }

  // Check if any users already exist (security check)
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    return NextResponse.json(
      { error: 'تم إنشاء حساب المسؤول بالفعل. يرجى تسجيل الدخول.' },
      { status: 403 }
    );
  }

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني مستخدم بالفعل' },
      { status: 400 }
    );
  }

  // Use Better Auth's signUpEmail for proper password hashing
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
    headers: request.headers,
  }) as { user: { id: string; email: string; name: string } };

  // Update user to set emailVerified to true (auto-verify first admin)
  await prisma.user.update({
    where: { id: signUpResult.user.id },
    data: { emailVerified: true },
  });

  // Auto-login by signing in immediately after signup
  const loginResult = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
    headers: request.headers,
  }) as { session?: { token?: string }; token?: string; user?: { id: string; email: string; name: string } };

  // Better Auth may return the token as `token` or nested under `session.token`
  const sessionToken = loginResult.token || loginResult.session?.token;

  // Create response
  const response = NextResponse.json({
    success: true,
    user: loginResult.user,
    message: 'تم إنشاء حساب المسؤول بنجاح',
  });

  // Set the session cookie
  if (sessionToken) {
    response.cookies.set('better_auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }

  return response;
});
