import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  checkLoginThrottle,
  recordLoginAttempt,
  getClientIp,
} from '@/lib/login-throttle';
import { isValidEmail } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/login
 *
 * Authenticate admin user and create session using Better Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, remember } = body;

    // Get client IP for throttling
    const ip = getClientIp(request);

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

    // Check throttling for both email and IP
    const emailThrottle = await checkLoginThrottle(email);
    if (!emailThrottle.allowed) {
      return NextResponse.json(
        {
          error: emailThrottle.error,
          lockoutUntil: emailThrottle.lockoutUntil,
        },
        { status: 429 }
      );
    }

    const ipThrottle = await checkLoginThrottle(ip);
    if (!ipThrottle.allowed) {
      return NextResponse.json(
        {
          error: ipThrottle.error,
          lockoutUntil: ipThrottle.lockoutUntil,
        },
        { status: 429 }
      );
    }

    // Check if user exists before attempting auth (for throttling)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Record failed attempt for both email and IP
      await recordLoginAttempt(email, false, ip);
      await recordLoginAttempt(ip, false, ip);

      const remainingAttempts = emailThrottle.remainingAttempts! - 1;

      return NextResponse.json(
        {
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 401 }
      );
    }

    // Try to sign in using Better Auth
    try {
      // Better Auth returns the session data
      const authResult = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: request.headers,
      }) as any;

      // Better Auth returns { session, user } or { token, user } depending on version
      const sessionToken = authResult.session?.token || authResult.token;
      const userData = authResult.user;

      // Debug: Log what Better Auth returns
      console.log('[LOGIN] Better Auth result:', JSON.stringify({
        hasSession: !!authResult.session,
        hasToken: !!sessionToken,
        hasUser: !!userData,
        token: sessionToken?.substring(0, 20) + '...',
        userId: userData?.id,
      }));

      // Record successful login and reset attempts
      await recordLoginAttempt(email, true, ip);
      await recordLoginAttempt(ip, true, ip);

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
        console.log('[LOGIN] Cookie set successfully with token:', sessionToken?.substring(0, 20) + '...');
      } else {
        console.error('[LOGIN] No session token received from Better Auth');
      }

      return response;
    } catch (authError: any) {
      // Better Auth threw an error (wrong password, etc.)
      // Record failed attempt for both email and IP
      await recordLoginAttempt(email, false, ip);
      await recordLoginAttempt(ip, false, ip);

      const remainingAttempts = emailThrottle.remainingAttempts! - 1;

      return NextResponse.json(
        {
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}
