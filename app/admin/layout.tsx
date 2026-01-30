import { getServerSession } from '@/lib/auth';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { getBreadcrumbs } from '@/lib/admin-nav';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'لوحة التحكم | نظام إدارة المحتوى',
  description: 'لوحة تحكم نظام إدارة المحتوى للصحفيين',
};

// Auth routes that should NOT show admin layout (sidebar/navbar)
// These paths are handled by the (auth) route group layout
const AUTH_ROUTES = ['/admin/login', '/admin/setup'];

/**
 * Admin Layout
 *
 * Provides the sidebar navigation and top bar for admin pages.
 * Protected routes are handled by middleware - if we reach here, user is authenticated.
 * Auth pages (login/setup) skip the admin wrapper and render directly.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current path from headers
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/admin/dashboard';

  // Auth routes (login/setup) should NOT show admin layout
  // They render directly without sidebar/navbar
  // The (auth) route group has its own minimal layout
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  // For protected admin pages, get user info for display
  // Middleware already validated the session, so we trust we're authenticated
  // If session lookup fails, we still show the layout with a fallback name
  let userName = 'مدير النظام'; // Default fallback name

  try {
    const session = await getServerSession();
    if (session?.user?.name) {
      userName = session.user.name;
    }
  } catch (error) {
    console.error('Error getting session in admin layout:', error);
    // Continue with fallback name - middleware already validated auth
  }

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <AdminLayoutWrapper
      userName={userName}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
