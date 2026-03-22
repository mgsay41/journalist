import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/validate-session
 *
 * Validate session token against database
 * Used by middleware for session validation
 */
export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('better_auth_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ valid: false, reason: 'no_token' });
    }

    // Look up session in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'session_not_found' });
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      // Delete expired session
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ valid: false, reason: 'session_expired' });
    }
    return NextResponse.json({
      valid: true,
      user: session.user,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('[VALIDATE-SESSION] Error:', error);
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 });
  }
}
