import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import {
  analyzeCommonQueries,
  getTableStats,
  detectMissingIndexes,
} from '@/lib/database/query-analyzer';
import { withErrorHandler } from '@/lib/errors/handler';

/**
 * GET /api/admin/database/analyze
 *
 * Analyze database queries and provide optimization recommendations
 * Phase 2 Backend Audit - Database Query Performance Analysis
 */
export const GET = withErrorHandler(async (request: Request) => {
  // Verify admin session
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 401 }
    );
  }

  // Get URL parameters
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'all';

  let data;

  switch (action) {
    case 'queries':
      data = await analyzeCommonQueries();
      break;

    case 'tables':
      data = await getTableStats();
      break;

    case 'indexes':
      data = await detectMissingIndexes();
      break;

    case 'all':
    default:
      const [queries, tables, indexes] = await Promise.all([
        analyzeCommonQueries(),
        getTableStats(),
        detectMissingIndexes(),
      ]);

      data = {
        queries,
        tables,
        missingIndexes: indexes,
      };
      break;
  }

  return NextResponse.json({
    success: true,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
});
