import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';

/**
 * POST /api/auth/signup
 *
 * Create the first admin user (first-time setup only)
 * This endpoint only works if no users exist in the database
 * Uses Better Auth's built-in signUpEmail for proper password hashing
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صالح' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
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
    }) as any;

    console.log('[SIGNUP] SignUp result:', JSON.stringify({
      hasUser: !!signUpResult.user,
      userId: signUpResult.user?.id,
    }));

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
    }) as any;

    console.log('[SIGNUP] Login result:', JSON.stringify({
      hasToken: !!loginResult.token,
      hasUser: !!loginResult.user,
      token: loginResult.token?.substring(0, 20) + '...',
      userId: loginResult.user?.id,
    }));

    // Create response
    const response = NextResponse.json({
      success: true,
      user: loginResult.user,
      message: 'تم إنشاء حساب المسؤول بنجاح',
    });

    // Set the session cookie
    // Using default Better Auth cookie name (no custom prefix)
    if (loginResult.token) {
      // Set cookie with underscore (no dots to avoid encoding issues)
      response.cookies.set('better_auth_session', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      console.log('[SIGNUP] Cookie set successfully with token:', loginResult.token?.substring(0, 20) + '...');
    } else {
      console.log('[SIGNUP] WARNING: No token in login result!');
    }

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الحساب' },
      { status: 500 }
    );
  }
}
