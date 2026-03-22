/**
 * Data Cleanup Cron Job
 *
 * Phase 5 Backend Audit - Data Integrity & Maintenance
 *
 * Performs periodic cleanup tasks:
 * - Deletes expired preview tokens
 * - Deletes old read notifications
 * - Archives old article revisions
 * - Clears stale cache entries
 * - Removes orphaned records
 *
 * Configure in hosting platform (Vercel, etc.) to run daily or weekly
 * Recommended schedule: Daily at 2 AM UTC
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";
import { memoryCache } from "@/lib/cache";

/**
 * Configuration for cleanup operations
 */
const CLEANUP_CONFIG = {
  // Delete preview tokens older than 7 days
  previewTokenAgeDays: 7,

  // Delete read notifications older than 90 days
  notificationAgeDays: 90,

  // Archive article revisions older than 1 year
  articleRevisionAgeDays: 365,

  // Delete failed AiUsage records older than 30 days
  aiUsageAgeDays: 30,
} as const;

/**
 * Cleanup result interface
 */
interface CleanupResult {
  operation: string;
  success: boolean;
  deleted: number;
  error?: string;
}

/**
 * Delete expired preview tokens
 */
async function cleanupExpiredPreviewTokens(): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.previewTokenAgeDays);

    const result = await prisma.previewToken.deleteMany({
      where: {
        expiresAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired preview tokens`, {
      count: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      operation: "previewTokens",
      success: true,
      deleted: result.count,
    };
  } catch (error) {
    logger.error("Failed to cleanup preview tokens", { error });
    return {
      operation: "previewTokens",
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete old read notifications
 */
async function cleanupOldNotifications(): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.notificationAgeDays);

    const result = await prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old read notifications`, {
      count: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      operation: "notifications",
      success: true,
      deleted: result.count,
    };
  } catch (error) {
    logger.error("Failed to cleanup notifications", { error });
    return {
      operation: "notifications",
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Archive old article revisions
 * Note: In a real implementation, you might want to export these to cold storage
 * instead of just deleting them
 */
async function archiveOldArticleRevisions(): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.articleRevisionAgeDays);

    // First, count them for logging
    const count = await prisma.articleRevision.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // For now, we'll just delete old revisions
    // In production, consider archiving to S3 or similar
    const result = await prisma.articleRevision.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Archived ${result.count} old article revisions`, {
      count: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      operation: "articleRevisions",
      success: true,
      deleted: result.count,
    };
  } catch (error) {
    logger.error("Failed to archive article revisions", { error });
    return {
      operation: "articleRevisions",
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete old AI usage records
 * Records older than the cutoff date are removed to keep the table size manageable
 * In production, consider archiving to cold storage instead of deleting
 */
async function cleanupOldAiUsageRecords(): Promise<CleanupResult> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.aiUsageAgeDays);

    const result = await prisma.aiUsage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old AI usage records`, {
      count: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      operation: "aiUsage",
      success: true,
      deleted: result.count,
    };
  } catch (error) {
    logger.error("Failed to cleanup AI usage records", { error });
    return {
      operation: "aiUsage",
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clear stale cache entries
 */
async function cleanupStaleCache(): Promise<CleanupResult> {
  try {
    // Get size before clearing
    const beforeSize = memoryCache.getSize();

    // Clear all cache entries
    memoryCache.clear();

    logger.info(`Cleared stale cache entries`, {
      entriesCleared: beforeSize,
    });

    return {
      operation: "cache",
      success: true,
      deleted: beforeSize,
    };
  } catch (error) {
    logger.error("Failed to cleanup cache", { error });
    return {
      operation: "cache",
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main cleanup handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret (recommended for production)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cleanup cron attempt", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting data cleanup cron job");

    // Run all cleanup operations in parallel for efficiency
    const results = await Promise.all([
      cleanupExpiredPreviewTokens(),
      cleanupOldNotifications(),
      archiveOldArticleRevisions(),
      cleanupOldAiUsageRecords(),
      cleanupStaleCache(),
    ]);

    // Calculate summary
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    const successfulOps = results.filter((r) => r.success).length;
    const failedOps = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    const response = {
      success: true,
      duration,
      summary: {
        totalDeleted,
        successfulOperations: successfulOps,
        failedOperations: failedOps,
      },
      results,
    };

    logger.info("Data cleanup cron job completed", {
      totalDeleted,
      successfulOps,
      failedOps,
      duration,
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Data cleanup cron job failed", { error, duration });

    return NextResponse.json(
      {
        error: "فشل في عملية التنظيف",
        details: error instanceof Error ? error.message : String(error),
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for manual testing (remove or restrict in production)
 */
export async function GET(request: NextRequest) {
  try {
    // Simple auth check for testing
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Provide CRON_SECRET in Authorization header as Bearer token",
        },
        { status: 401 }
      );
    }

    // Run the same logic as POST
    return POST(request);
  } catch (error) {
    return NextResponse.json(
      { error: "فشل في عملية التنظيف" },
      { status: 500 }
    );
  }
}
