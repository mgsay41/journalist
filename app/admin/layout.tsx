import { getCurrentUser } from '@/lib/auth-utils';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { getBreadcrumbs } from '@/lib/admin-nav';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'لوحة التحكم | نظام إدارة المحتوى',
  description: 'لوحة تحكم نظام إدارة المحتوى للصحفيين',
};

/**
 * Admin Layout
 *
 * Provides the sidebar navigation and top bar for all admin pages.
 * Protected route - requires authentication.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Should be handled by middleware, but redirect as fallback
    return null;
  }

  // Get current path from headers
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/admin/dashboard';
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <AdminLayoutWrapper
      userName={user.name}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
