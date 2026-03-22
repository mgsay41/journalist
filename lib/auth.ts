import { betterAuth } from "better-auth";
import { prisma } from "./prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";

/**
 * Better Auth Configuration
 *
 * Authentication system using Better Auth with Prisma adapter.
 * Includes session management, secure cookies, and CSRF protection.
 */
export const auth = betterAuth({
  // Secret for signing tokens and encrypting data
  // Can use BETTER_AUTH_SECRET or fall back to NEXTAUTH_SECRET for compatibility
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    // Single-admin CMS: email verification disabled by default.
    // Set REQUIRE_EMAIL_VERIFICATION=true in production if multiple users are added.
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Advanced security settings
  advanced: {
    // Using default cookie prefix to avoid issues with dots in cookie names
    // Better Auth will use "better-auth" as the default prefix
    crossSubDomainCookies: {
      enabled: false,
    },
    // CSRF protection enabled for security (Phase 1 Backend Audit)
    csrfProtection: true,
    // Configure CSRF check path
    csrfCheckPath: '/api/auth/csrf',
  },

  // Social providers (disabled - only admin account)
  socialProviders: {
    // Add future social providers here if needed
  },

  // Account management
  account: {
    accountLinking: {
      enabled: false,
      trustedProviders: [],
    },
  },
});

// Export auth types - Infer from Better Auth
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

/**
 * Get the current session on the server side
 * This helper function gets the session from cookies in API routes and server components
 * Uses direct database lookup for reliable session validation
 */
export async function getServerSession() {
  try {
    // Import cookies from next/headers
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Get session token - try both cookie names (Better Auth default and our custom)
    const sessionToken =
      cookieStore.get('better-auth.session_token')?.value ||
      cookieStore.get('better_auth_session')?.value;

    if (!sessionToken) {
      return null;
    }

    // Look up session directly in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      // Delete expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Return in the format expected by auth-utils
    return {
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        token: session.token,
        userId: session.userId,
      },
      user: session.user,
    };
  } catch (error) {
    // Improved error logging
    if (error instanceof Error) {
      console.error('Error getting server session:', error.message);
    } else {
      console.error('Error getting server session:', error);
    }
    return null;
  }
}
