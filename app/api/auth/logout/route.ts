import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/logout
 *
 * Logout user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session token from cookies
    const sessionToken = request.cookies.get('better_auth_session')?.value;

    // Delete the session from database if token exists
    if (sessionToken) {
      try {
        await prisma.session.deleteMany({
          where: { token: sessionToken },
        });
        console.log('[LOGOUT] Session deleted from database');
      } catch (dbError) {
        console.error('[LOGOUT] Failed to delete session from database:', dbError);
      }
    }

    // Create redirect response
    const response = NextResponse.redirect(new URL('/admin/login', request.url), {
      status: 302,
    });

    // Clear all session cookies
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0),
    };

    // Clear the main session cookie
    response.cookies.set('better_auth_session', '', cookieOptions);

    // Clear any legacy cookies that might exist
    response.cookies.set('journalist_cms.session_token', '', cookieOptions);
    response.cookies.set('journalist_cms_session_token', '', cookieOptions);
    response.cookies.set('session_token', '', cookieOptions);

    console.log('[LOGOUT] Cookies cleared, redirecting to login');
    return response;
  } catch (error) {
    console.error('Logout error:', error);

    // If there's an error, still try to redirect and clear cookies
    const response = NextResponse.redirect(new URL('/admin/login', request.url));

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0),
    };

    response.cookies.set('better_auth_session', '', cookieOptions);
    response.cookies.set('journalist_cms.session_token', '', cookieOptions);
    response.cookies.set('journalist_cms_session_token', '', cookieOptions);
    response.cookies.set('session_token', '', cookieOptions);

    return response;
  }
}
