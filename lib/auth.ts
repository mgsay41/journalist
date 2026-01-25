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
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Only one admin, no verification needed
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
    cookiePrefix: "journalist_cms",
    crossSubDomainCookies: {
      enabled: false,
    },
    csrfProtection: true,
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
