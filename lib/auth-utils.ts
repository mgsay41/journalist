import { getServerSession } from './auth';

/**
 * Auth user type (without sensitive data)
 * Re-exported for backward compatibility
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

/**
 * Get current session using Better Auth
 * This is now a wrapper around getServerSession for backward compatibility
 */
export async function getSession(): Promise<{ user: AuthUser; expiresAt: Date } | null> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image ?? null,
      },
      expiresAt: new Date(session.session.expiresAt),
    };
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
