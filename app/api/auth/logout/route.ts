import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/errors/handler';

/**
 * POST /api/auth/logout
 *
 * Logout user and invalidate session
 * Phase 1 Backend Audit - Enhanced with error handling
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Get the session token from cookies
  const sessionToken = request.cookies.get('better_auth_session')?.value;

  // Delete the session from database if token exists
  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { token: sessionToken },
    });
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

  return response;
});
