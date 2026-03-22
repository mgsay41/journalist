/**
 * GET /api/admin/csrf
 *
 * Returns a CSRF token for the current session.
 * Phase 2 Frontend Audit - CSRF Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createCsrfToken } from '@/lib/security/csrf';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // Get session ID from database
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        { error: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });

    const sessionToken =
      cookies['better_auth_session'] ||
      cookies['better-auth.session_token'] ||
      cookies['better_auth_session_token'];

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    const dbSession = await prisma.session.findUnique({
      where: { token: sessionToken },
      select: { id: true },
    });

    if (!dbSession) {
      return NextResponse.json(
        { error: 'جلسة غير صالحة' },
        { status: 401 }
      );
    }

    // Generate CSRF token
    const csrfToken = await createCsrfToken(dbSession.id);

    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'خطأ في إنشاء رمز CSRF' },
      { status: 500 }
    );
  }
}
