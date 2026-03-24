/**
 * AI Usage Tracking Service
 *
 * Tracks token usage and costs per user for Gemini API calls.
 * Stores usage data in the database for reporting and billing.
 */

import { prisma } from "../prisma";
import { GEMINI_MODELS, type GeminiModelId } from "../gemini";

// AI Feature types for tracking
export type AiFeature =
  | "seo-suggestions"
  | "meta-title"
  | "meta-description"
  | "keywords"
  | "expand-content"
  | "summarize-content"
  | "rewrite-content"
  | "generate-intro"
  | "generate-conclusion"
  | "grammar-check"
  | "alt-text"
  | "related-topics"
  | "complete-article"
  | "rewrite-article"
  | "auto-fix-internal-links"
  | "auto-fix-external-links"
  | "auto-fix-long-paragraphs"
  | "auto-fix-seo-issues"
  | "auto-tagging"
  | "headline-optimization"
  | "outline-generation"
  | "writing-assistant-autocomplete"
  | "writing-assistant-improve-word"
  | "writing-assistant-fix-passive"
  | "writing-assistant-suggest-transitions"
  | "writing-assistant-expand-text"
  | "writing-assistant-summarize-text";

// Usage record interface
export interface UsageRecord {
  userId: string;
  feature: AiFeature;
  model: GeminiModelId;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
}

// Calculate cost based on model and tokens
export function calculateCost(
  model: GeminiModelId,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const modelInfo = GEMINI_MODELS[model];
  if (!modelInfo) {
    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  // Costs are per 1M tokens, convert to actual cost
  const inputCost = (inputTokens / 1_000_000) * modelInfo.inputCost;
  const outputCost = (outputTokens / 1_000_000) * modelInfo.outputCost;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000, // 6 decimal precision
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
  };
}

// Record a single AI usage
export async function recordAiUsage(record: UsageRecord): Promise<void> {
  const { userId, feature, model, inputTokens, outputTokens, cached } = record;

  // If cached, no tokens were actually used
  const actualInputTokens = cached ? 0 : inputTokens;
  const actualOutputTokens = cached ? 0 : outputTokens;

  const costs = calculateCost(model, actualInputTokens, actualOutputTokens);

  await prisma.aiUsage.create({
    data: {
      userId,
      feature,
      model,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      inputCost: costs.inputCost,
      outputCost: costs.outputCost,
      totalCost: costs.totalCost,
      cached,
    },
  });
}

// Usage statistics interfaces
export interface UserUsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cachedRequests: number;
  byFeature: {
    feature: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
  byDay: {
    date: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
}

export interface AllUsersStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cachedRequests: number;
  byUser: {
    userId: string;
    userName: string;
    userEmail: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
  byFeature: {
    feature: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }[];
}

// Get usage statistics for a specific user
export async function getUserUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<UserUsageStats> {
  const where = {
    userId,
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  // Get all usage records for the user
  const usageRecords = await prisma.aiUsage.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // Calculate totals
  const totalRequests = usageRecords.length;
  const totalInputTokens = usageRecords.reduce(
    (sum, r) => sum + r.inputTokens,
    0
  );
  const totalOutputTokens = usageRecords.reduce(
    (sum, r) => sum + r.outputTokens,
    0
  );
  const totalCost = usageRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const cachedRequests = usageRecords.filter((r) => r.cached).length;

  // Group by feature
  const featureMap = new Map<
    string,
    { requests: number; inputTokens: number; outputTokens: number; cost: number }
  >();
  for (const record of usageRecords) {
    const existing = featureMap.get(record.feature) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    featureMap.set(record.feature, {
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + record.inputTokens,
      outputTokens: existing.outputTokens + record.outputTokens,
      cost: existing.cost + record.totalCost,
    });
  }

  // Group by day
  const dayMap = new Map<
    string,
    { requests: number; inputTokens: number; outputTokens: number; cost: number }
  >();
  for (const record of usageRecords) {
    const date = record.createdAt.toISOString().split("T")[0];
    const existing = dayMap.get(date) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    dayMap.set(date, {
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + record.inputTokens,
      outputTokens: existing.outputTokens + record.outputTokens,
      cost: existing.cost + record.totalCost,
    });
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
    cachedRequests,
    byFeature: Array.from(featureMap.entries()).map(([feature, stats]) => ({
      feature,
      ...stats,
      cost: Math.round(stats.cost * 1_000_000) / 1_000_000,
    })),
    byDay: Array.from(dayMap.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
        cost: Math.round(stats.cost * 1_000_000) / 1_000_000,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Get usage statistics for all users (admin function)
export async function getAllUsersStats(
  startDate?: Date,
  endDate?: Date
): Promise<AllUsersStats> {
  const where = {
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  // Get all usage records with user info
  const usageRecords = await prisma.aiUsage.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate totals
  const totalRequests = usageRecords.length;
  const totalInputTokens = usageRecords.reduce(
    (sum, r) => sum + r.inputTokens,
    0
  );
  const totalOutputTokens = usageRecords.reduce(
    (sum, r) => sum + r.outputTokens,
    0
  );
  const totalCost = usageRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const cachedRequests = usageRecords.filter((r) => r.cached).length;

  // Group by user
  const userMap = new Map<
    string,
    {
      userName: string;
      userEmail: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  >();
  for (const record of usageRecords) {
    const existing = userMap.get(record.userId) || {
      userName: record.user.name,
      userEmail: record.user.email,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    userMap.set(record.userId, {
      userName: record.user.name,
      userEmail: record.user.email,
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + record.inputTokens,
      outputTokens: existing.outputTokens + record.outputTokens,
      cost: existing.cost + record.totalCost,
    });
  }

  // Group by feature
  const featureMap = new Map<
    string,
    { requests: number; inputTokens: number; outputTokens: number; cost: number }
  >();
  for (const record of usageRecords) {
    const existing = featureMap.get(record.feature) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    featureMap.set(record.feature, {
      requests: existing.requests + 1,
      inputTokens: existing.inputTokens + record.inputTokens,
      outputTokens: existing.outputTokens + record.outputTokens,
      cost: existing.cost + record.totalCost,
    });
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
    cachedRequests,
    byUser: Array.from(userMap.entries())
      .map(([userId, stats]) => ({
        userId,
        ...stats,
        cost: Math.round(stats.cost * 1_000_000) / 1_000_000,
      }))
      .sort((a, b) => b.cost - a.cost), // Sort by cost descending
    byFeature: Array.from(featureMap.entries())
      .map(([feature, stats]) => ({
        feature,
        ...stats,
        cost: Math.round(stats.cost * 1_000_000) / 1_000_000,
      }))
      .sort((a, b) => b.requests - a.requests), // Sort by requests descending
  };
}

// Get recent usage records (for debugging/monitoring)
export async function getRecentUsage(
  limit = 100
): Promise<
  Array<{
    id: string;
    userId: string;
    userName: string;
    feature: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    cached: boolean;
    createdAt: Date;
  }>
> {
  const records = await prisma.aiUsage.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return records.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    feature: r.feature,
    model: r.model,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    totalCost: r.totalCost,
    cached: r.cached,
    createdAt: r.createdAt,
  }));
}
