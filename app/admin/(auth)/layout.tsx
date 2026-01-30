/**
 * Auth Layout for Login/Setup pages
 *
 * This layout overrides the admin layout for auth pages,
 * preventing the sidebar and navbar from showing on login/setup pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simply render children without any admin wrapper
  // This prevents the AdminLayoutWrapper from being applied
  return <>{children}</>;
}
