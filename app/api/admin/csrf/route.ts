/**
 * GET /api/admin/csrf
 *
 * Returns a CSRF token for the current session.
 * Phase 2 Frontend Audit - CSRF Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createCsrfToken } from '@/lib/security/csrf';

export async function GET(_request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // Generate CSRF token bound to the session ID
    const csrfToken = await createCsrfToken(session.session.id);

    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'خطأ في إنشاء رمز CSRF' },
      { status: 500 }
    );
  }
}
