import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for authentication and route protection
 *
 * - Redirects to /admin/setup if no admin exists
 * - Protects admin routes with session validation
 * - Redirects logged-in users away from login page
 *
 * Note: Uses fetch to call API routes for Edge Runtime compatibility.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an admin route
  if (pathname.startsWith('/admin')) {
    // Check if system has been set up (has admin users)
    let hasAdmin = false;
    try {
      const checkUrl = new URL('/api/auth/check-setup', request.url);
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        hasAdmin = data.hasAdmin;
      }
    } catch (error) {
      console.error('[Middleware] Failed to check admin status:', error);
      // Default to assuming admin exists to prevent redirect loop
      hasAdmin = true;
    }

    // === Setup Page Protection ===
    if (pathname === '/admin/setup') {
      // If admin already exists, redirect to login
      if (hasAdmin) {
        console.log('[Middleware] Admin exists, redirecting from setup to login');
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      // No admin exists, allow access to setup page
      const response = NextResponse.next();
      response.headers.set('x-pathname', pathname);
      return response;
    }

    // === Redirect to Setup if Not Configured ===
    if (!hasAdmin) {
      console.log('[Middleware] No admin exists, redirecting to setup');
      return NextResponse.redirect(new URL('/admin/setup', request.url));
    }

    // === Validate Session ===
    // Use API route for session validation (Edge Runtime compatible)
    let isValidSession = false;
    let sessionUser = null;

    try {
      const validateUrl = new URL('/api/auth/validate-session', request.url);
      const validateResponse = await fetch(validateUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Forward cookies to the validation endpoint
          'Cookie': request.headers.get('cookie') || '',
        },
      });

      if (validateResponse.ok) {
        const data = await validateResponse.json();
        isValidSession = data.valid === true;
        sessionUser = data.user;
        console.log('[Middleware] Session validation result:', {
          valid: isValidSession,
          userId: sessionUser?.id,
          reason: data.reason,
        });
      }
    } catch (error) {
      console.error('[Middleware] Session validation error:', error);
    }

    // === Login Page ===
    if (pathname === '/admin/login') {
      // If already logged in, redirect to dashboard
      if (isValidSession) {
        console.log('[Middleware] Already logged in, redirecting to dashboard');
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }

      // Not logged in, allow access to login page
      const response = NextResponse.next();
      response.headers.set('x-pathname', pathname);
      return response;
    }

    // === Protected Admin Routes ===
    if (!isValidSession) {
      // No valid session, redirect to login
      console.log('[Middleware] No valid session, redirecting to login');
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Valid session, continue with x-pathname header
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
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
