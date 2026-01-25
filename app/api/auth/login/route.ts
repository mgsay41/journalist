import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { isValidEmail } from '@/lib/utils';
import {
  checkLoginThrottle,
  recordLoginAttempt,
  getClientIp,
} from '@/lib/login-throttle';

/**
 * POST /api/auth/login
 *
 * Authenticate admin user and create session
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        emailVerified: true,
        image: true,
      },
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
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

    // Record successful login and reset attempts
    await recordLoginAttempt(email, true, ip);
    await recordLoginAttempt(ip, true, ip);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + remember ? 30 : 7); // 30 days if remember, else 7 days

    // Generate session token
    const token = generateSessionToken();

    // Save session to database
    const session = await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });

    // Set session cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}

/**
 * Generate secure random session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
