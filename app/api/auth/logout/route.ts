import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/logout
 *
 * Logout user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const token = request.cookies.get('session_token')?.value;

    if (token) {
      // Delete session from database
      await prisma.session.delete({
        where: { token },
      }).catch(() => {
        // Session might not exist, that's okay
      });
    }

    // Create redirect response and clear session cookie
    const response = NextResponse.redirect(new URL('/admin/login', request.url));

    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear the cookie even if there was an error
    const response = NextResponse.redirect(new URL('/admin/login', request.url));

    response.cookies.delete('session_token');

    return response;
  }
}
