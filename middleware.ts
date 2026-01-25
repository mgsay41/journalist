import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Middleware for authentication and route protection
 *
 * Handles first-time setup, login, and protects admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an admin route
  if (pathname.startsWith('/admin')) {
    // Check if system has been set up (has admin users)
    let hasAdmin = false;
    try {
      const userCount = await prisma.user.count();
      hasAdmin = userCount > 0;
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }

    // If no admin exists, redirect to setup (except setup page itself)
    if (!hasAdmin && pathname !== '/admin/setup') {
      return NextResponse.redirect(new URL('/admin/setup', request.url));
    }

    // If admin exists and trying to access setup page, redirect to login
    if (hasAdmin && pathname === '/admin/setup') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Allow setup page without auth when no admin exists
    if (pathname === '/admin/setup' && !hasAdmin) {
      return NextResponse.next();
    }

    // Allow login page
    if (pathname === '/admin/login') {
      // If already logged in, redirect to dashboard
      const token = request.cookies.get('session_token')?.value;

      if (token) {
        try {
          const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
          });

          if (session && session.expiresAt > new Date()) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          }
        } catch {
          // Invalid session, continue to login page
        }
      }

      return NextResponse.next();
    }

    // Protect other admin routes
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      // No token, redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        // Invalid or expired session
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('session_token');
        return response;
      }

      // Valid session, continue
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware auth error:', error);
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Non-admin routes, continue normally
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: '/admin/:path*',
};
