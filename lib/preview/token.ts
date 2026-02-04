// Preview token utilities for secure article preview

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * Generate a secure preview token for an article
 */
export async function generatePreviewToken(articleId: string): Promise<string> {
  // Delete any existing tokens for this article
  await prisma.previewToken.deleteMany({
    where: { articleId },
  });

  // Generate a secure random token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString("hex");

  // Set expiration to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Store the token
  await prisma.previewToken.create({
    data: {
      articleId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a preview token and return the article if valid
 */
export async function verifyPreviewToken(token: string) {
  const previewToken = await prisma.previewToken.findUnique({
    where: { token },
    include: {
      article: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          categories: true,
          tags: true,
          featuredImage: true,
        },
      },
    },
  });

  if (!previewToken) {
    return null;
  }

  // Check if token has expired
  if (previewToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.previewToken.delete({
      where: { id: previewToken.id },
    });
    return null;
  }

  return previewToken.article;
}

/**
 * Delete a preview token
 */
export async function deletePreviewToken(token: string): Promise<void> {
  await prisma.previewToken.deleteMany({
    where: { token },
  });
}

/**
 * Delete all preview tokens for an article
 */
export async function deleteArticlePreviewTokens(articleId: string): Promise<void> {
  await prisma.previewToken.deleteMany({
    where: { articleId },
  });
}

/**
 * Clean up expired preview tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const now = new Date();
  const result = await prisma.previewToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });
  return result.count;
}
