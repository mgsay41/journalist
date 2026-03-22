/**
 * Database Query Analyzer
 *
 * Phase 2 Backend Audit - Query Performance Analysis
 *
 * Provides utilities to:
 * - Run EXPLAIN ANALYZE on queries
 * - Detect missing indexes
 * - Identify slow queries
 * - Suggest query optimizations
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';

/**
 * Query analysis result
 */
export interface QueryAnalysisResult {
  query: string;
  executionPlan: QueryPlanNode;
  executionTime: number;
  totalCost: number;
  rowsAffected: number;
  issues: QueryIssue[];
  recommendations: string[];
}

/**
 * Query plan node from EXPLAIN ANALYZE
 */
export interface QueryPlanNode {
  nodeType: string;
  relationName?: string;
  schema?: string;
  alias?: string;
  indexName?: string;
  indexCondition?: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;
  actualRows: number;
  actualLoops: number;
  actualStartupTime: number;
  actualTotalTime: number;
  plans?: QueryPlanNode[];
  [key: string]: any;
}

/**
 * Query issue detected during analysis
 */
export interface QueryIssue {
  type: 'missing_index' | 'sequential_scan' | 'high_cost' | 'n_loop' | 'sort' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Run EXPLAIN ANALYZE on a query
 *
 * @param query - The SQL query to analyze
 * @param params - Query parameters
 * @returns Query analysis result
 */
export async function analyzeQuery(
  query: string,
  params: any[] = []
): Promise<QueryAnalysisResult> {
  try {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await prisma.$queryRawUnsafe(explainQuery, ...params) as any[];

    const planData = result[0]['QUERY PLAN']?.[0];
    if (!planData) {
      throw new Error('Invalid EXPLAIN ANALYZE result');
    }

    const plan = planData.Plan;
    const executionTime = planData['Execution Time'] || 0;
    const totalCost = plan['Total Cost'] || plan.total_cost || 0;
    const rows = plan.PlanRows || plan.plan_rows || 0;

    // Analyze the plan for issues
    const issues = analyzePlan(plan);
    const recommendations = generateRecommendations(issues, plan);

    return {
      query,
      executionPlan: plan,
      executionTime,
      totalCost,
      rowsAffected: rows,
      issues,
      recommendations,
    };
  } catch (error) {
    logger.error('Failed to analyze query', { query, error });
    throw error;
  }
}

/**
 * Analyze a query plan for performance issues
 */
function analyzePlan(plan: QueryPlanNode, issues: QueryIssue[] = []): QueryIssue[] {
  // Check for sequential scans on large tables
  if (plan.nodeType === 'Seq Scan') {
    const actualRows = plan.actualRows || plan.planRows || 0;
    if (actualRows > 1000) {
      issues.push({
        type: 'sequential_scan',
        severity: actualRows > 10000 ? 'high' : 'medium',
        message: `Sequential scan on ${plan.relationName || 'table'} affecting ${actualRows} rows`,
        details: {
          relation: plan.relationName,
          rows: actualRows,
        },
      });
    }
  }

  // Check for missing indexes
  if (plan.nodeType === 'Seq Scan' && !plan.indexName) {
    issues.push({
      type: 'missing_index',
      severity: 'medium',
      message: `Possible missing index on ${plan.relationName || 'table'}`,
      details: {
        relation: plan.relationName,
        condition: plan.indexCondition,
      },
    });
  }

  // Check for high execution cost
  if (plan.totalCost > 10000) {
    issues.push({
      type: 'high_cost',
      severity: 'high',
      message: `High execution cost: ${plan.totalCost.toFixed(2)}`,
      details: {
        cost: plan.totalCost,
        nodeType: plan.nodeType,
      },
    });
  }

  // Check for nested loops with many iterations
  if (plan.nodeType === 'Nested Loop' && plan.actualLoops > 1000) {
    issues.push({
      type: 'n_loop',
      severity: 'high',
      message: `Nested loop executed ${plan.actualLoops} times`,
      details: {
        loops: plan.actualLoops,
      },
    });
  }

  // Check for expensive sort operations
  if (plan.nodeType === 'Sort') {
    const sortCost = plan.totalCost || 0;
    if (sortCost > 5000) {
      issues.push({
        type: 'sort',
        severity: 'medium',
        message: `Expensive sort operation with cost ${sortCost.toFixed(2)}`,
        details: {
          cost: sortCost,
        },
      });
    }
  }

  // Recursively analyze child plans
  if (plan.Plans) {
    for (const childPlan of plan.Plans) {
      analyzePlan(childPlan, issues);
    }
  }

  // Also check for plans array (different format)
  if (plan.plans) {
    for (const childPlan of plan.plans) {
      analyzePlan(childPlan, issues);
    }
  }

  return issues;
}

/**
 * Generate optimization recommendations based on issues
 */
function generateRecommendations(issues: QueryIssue[], plan: QueryPlanNode): string[] {
  const recommendations: string[] = [];

  for (const issue of issues) {
    switch (issue.type) {
      case 'sequential_scan':
        if (issue.details?.relation) {
          recommendations.push(
            `Consider adding an index on ${(issue.details as any).relation} for the filtered columns`
          );
        }
        break;

      case 'missing_index':
        if (issue.details?.condition) {
          recommendations.push(
            `Create an index to support: ${(issue.details as any).condition}`
          );
        }
        break;

      case 'high_cost':
        recommendations.push(
          'Review query structure and consider breaking it into smaller queries or adding appropriate indexes'
        );
        break;

      case 'n_loop':
        recommendations.push(
          'Consider using JOIN with appropriate indexes instead of nested loops, or review the join order'
        );
        break;

      case 'sort':
        recommendations.push(
          'Consider adding an index that matches the sort order to avoid expensive sort operations'
        );
        break;
    }
  }

  return recommendations;
}

/**
 * Analyze common queries in the application
 */
export async function analyzeCommonQueries(): Promise<{
  analyses: QueryAnalysisResult[];
  summary: {
    totalQueries: number;
    queriesWithIssues: number;
    criticalIssues: number;
  };
}> {
  const analyses: QueryAnalysisResult[] = [];

  // Common queries to analyze
  const commonQueries = [
    {
      name: 'List published articles',
      query: `
        SELECT * FROM "Article"
        WHERE status = 'published'
        ORDER BY "publishedAt" DESC
        LIMIT 20
      `,
    },
    {
      name: 'Search articles',
      query: `
        SELECT * FROM "Article"
        WHERE title ILIKE $1 OR content ILIKE $1
        ORDER BY "createdAt" DESC
        LIMIT 50
      `,
      params: ['%test%'],
    },
    {
      name: 'Get article by slug',
      query: `
        SELECT * FROM "Article"
        WHERE slug = $1
      `,
      params: ['test-article'],
    },
    {
      name: 'Get user articles',
      query: `
        SELECT * FROM "Article"
        WHERE "authorId" = $1
        ORDER BY "createdAt" DESC
      `,
      params: ['user-id'],
    },
    {
      name: 'Article with relations',
      query: `
        SELECT a.*,
          (SELECT COUNT(*) FROM "ArticleView" av WHERE av."articleId" = a.id) as views
        FROM "Article" a
        WHERE a.id = $1
      `,
      params: ['article-id'],
    },
  ];

  for (const { name, query, params } of commonQueries) {
    try {
      logger.info(`Analyzing query: ${name}`);
      const analysis = await analyzeQuery(query, params || []);
      analyses.push(analysis);
    } catch (error) {
      logger.warn(`Failed to analyze query: ${name}`, { error });
    }
  }

  const queriesWithIssues = analyses.filter((a) => a.issues.length > 0).length;
  const criticalIssues = analyses.reduce(
    (sum, a) => sum + a.issues.filter((i) => i.severity === 'critical').length,
    0
  );

  return {
    analyses,
    summary: {
      totalQueries: analyses.length,
      queriesWithIssues,
      criticalIssues,
    },
  };
}

/**
 * Get table statistics for optimization
 */
export async function getTableStats(): Promise<
  Array<{
    tableName: string;
    rows: number;
    totalSize: string;
    indexSize: string;
    indexes: Array<{
      indexName: string;
      columns: string;
      isUnique: boolean;
      isPrimary: boolean;
    }>;
  }>
> {
  const query = `
    SELECT
      t.tablename AS "tableName",
      c.reltuples::bigint AS "rows",
      pg_size_pretty(pg_total_relation_size(t.tablename::text)) AS "totalSize",
      pg_size_pretty(pg_indexes_size(t.tablename::text)) AS "indexSize"
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(t.tablename::text) DESC
  `;

  const tables = await prisma.$queryRawUnsafe(query) as any[];

  // Get indexes for each table
  const result = [];
  for (const table of tables) {
    const indexQuery = `
      SELECT
        i.relname AS "indexName",
        a.attname AS "column",
        ix.indisunique AS "isUnique",
        ix.indisprimary AS "isPrimary"
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
      ORDER BY i.relname, a.attnum
    `;

    const indexes = await prisma.$queryRawUnsafe(indexQuery, table.tableName) as any[];

    // Group columns by index
    const groupedIndexes: Map<string, any> = new Map();
    for (const idx of indexes) {
      if (!groupedIndexes.has(idx.indexName)) {
        groupedIndexes.set(idx.indexName, {
          indexName: idx.indexName,
          columns: [],
          isUnique: idx.isUnique,
          isPrimary: idx.isPrimary,
        });
      }
      groupedIndexes.get(idx.indexName)!.columns.push(idx.column);
    }

    result.push({
      ...table,
      indexes: Array.from(groupedIndexes.values()).map((idx) => ({
        ...idx,
        columns: idx.columns.join(', '),
      })),
    });
  }

  return result;
}

/**
 * Detect potentially missing indexes based on query patterns
 */
export async function detectMissingIndexes(): Promise<
  Array<{
    tableName: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>
> {
  // This is a simplified heuristic-based detection
  // In production, you'd analyze actual query logs

  const recommendations: Array<{
    tableName: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> = [
    {
      tableName: 'Article',
      columns: ['status', 'publishedAt'],
      reason: 'Frequently filtered by status and ordered by published date',
      priority: 'high',
    },
    {
      tableName: 'Article',
      columns: ['authorId', 'status'],
      reason: 'Common query pattern for user articles',
      priority: 'medium',
    },
    {
      tableName: 'Article',
      columns: ['seoScore'],
      reason: 'Used for SEO filtering (good/bad scores)',
      priority: 'low',
    },
    {
      tableName: 'Session',
      columns: ['userId', 'expiresAt'],
      reason: 'Session cleanup and validation queries',
      priority: 'high',
    },
  ];

  // Check which indexes already exist
  const existingIndexes = await prisma.$queryRaw`
    SELECT
      t.relname AS "tableName",
      a.attname AS "columnName"
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
  ` as any[];

  const existingMap = new Map<string, Set<string>>();
  for (const idx of existingIndexes) {
    if (!existingMap.has(idx.tableName)) {
      existingMap.set(idx.tableName, new Set());
    }
    existingMap.get(idx.tableName)!.add(idx.columnName);
  }

  // Filter out already implemented recommendations
  return recommendations.filter((rec) => {
    const existing = existingMap.get(rec.tableName);
    if (!existing) return true;
    return !rec.columns.every((col) => existing.has(col));
  });
}
