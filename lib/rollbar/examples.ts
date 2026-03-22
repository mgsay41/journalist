/**
 * Rollbar Instrumentation Examples
 *
 * Phase 5 Backend Audit - Practical Rollbar Usage Examples
 *
 * This file demonstrates how to use Rollbar throughout your application:
 * - API route error handling
 * - Database operation tracking
 * - External API call monitoring
 * - User action tracking
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { rollbar, logError, logCritical, logWarning, logInfo, createLoggerFromRequest, setRollbarUser } from './server';

// ============================================================================
// API ROUTE EXAMPLES
// ============================================================================

/**
 * Example: API Route with Rollbar Error Handling
 *
 * File: app/api/admin/articles/route.ts
 */
export async function exampleArticleRoute(request: NextRequest) {
  const logger = createLoggerFromRequest(request);

  try {
    // Log the request start
    logger.info('Fetching articles');

    // Your logic here...
    const articles: unknown[] = [];

    logger.info('Successfully fetched articles', { count: articles.length });

    return NextResponse.json({ articles });
  } catch (error) {
    // Log the error with full context
    logError(error, {
      endpoint: '/api/admin/articles',
      method: request.method,
    });

    return NextResponse.json(
      { error: 'فشل في جلب المقالات' },
      { status: 500 }
    );
  }
}

/**
 * Example: API Route with User Context
 *
 * File: app/api/admin/articles/[id]/route.ts
 */
export async function exampleArticleByIdRoute(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createLoggerFromRequest(request);

  try {
    // Assuming you have session from Better Auth
    // const session = await auth.api.getSession({ headers: request.headers });

    // Set user context for all errors in this request
    // setRollbarUser({
    //   id: session.user.id,
    //   username: session.user.name,
    //   role: 'admin',
    // });

    logger.info('Fetching article', { articleId: params.id });

    // Your logic here...

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, {
      endpoint: `/api/admin/articles/${params.id}`,
      method: request.method,
      articleId: params.id,
    });

    return NextResponse.json(
      { error: 'فشل في جلب المقال' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DATABASE OPERATION EXAMPLES
// ============================================================================

/**
 * Example: Database operation with error tracking
 */
export async function exampleDatabaseOperation(articleId: string) {
  const logger = new (await import('./server')).RollbarLogger({ operation: 'updateArticle' });

  try {
    // Database operation...
    // const article = await prisma.article.update({ ... });

    logger.info('Article updated successfully', { articleId });
  } catch (error) {
    logError(error, {
      operation: 'database_update',
      table: 'Article',
      articleId,
    });

    throw error; // Re-throw to handle at higher level
  }
}

/**
 * Example: Transaction with error tracking
 */
export async function exampleDatabaseTransaction() {
  const logger = new (await import('./server')).RollbarLogger();

  try {
    // Your transaction logic...

    logger.info('Transaction completed successfully');
  } catch (error) {
    logCritical('Database transaction failed', error instanceof Error ? error : undefined, {
      operation: 'transaction',
    });

    throw error;
  }
}

// ============================================================================
// EXTERNAL API CALL EXAMPLES
// ============================================================================

/**
 * Example: External API call with tracking
 */
export async function exampleExternalApiCall(content: string) {
  const logger = new (await import('./server')).RollbarLogger({ service: 'gemini-ai' });

  const startTime = Date.now();

  try {
    // Your API call...
    // const response = await fetch('https://generativelanguage.googleapis.com/...');

    const duration = Date.now() - startTime;

    logger.info('AI API call successful', {
      duration,
      contentLength: content.length,
    });

    // return await response.json();
  } catch (error) {
    const duration = Date.now() - startTime;

    logError(error, {
      service: 'gemini-ai',
      method: 'generateContent',
      duration,
      errorType: error instanceof Error ? error.name : 'unknown',
    });

    throw error;
  }
}

// ============================================================================
// CRITICAL ERROR EXAMPLES
// ============================================================================

/**
 * Example: Handle critical system failures
 */
export async function exampleCriticalError() {
  try {
    // Something that should never fail...
    const dbConnection = await connectToDatabase();

    if (!dbConnection) {
      // This is CRITICAL - database is down
      logCritical('Database connection failed', undefined, {
        service: 'database',
        host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0],
      });

      // Maybe send an alert or trigger a fallback
    }
  } catch (error) {
    logCritical('Unexpected system failure', error instanceof Error ? error : undefined);
  }
}

async function connectToDatabase() {
  // Dummy function
  return true;
}

// ============================================================================
// WARNING EXAMPLES
// ============================================================================

/**
 * Example: Log warnings for non-critical issues
 */
export async function exampleWarningLog(userQuota: number, maxQuota: number) {
  const logger = new (await import('./server')).RollbarLogger();

  // Check if user is approaching quota limit
  if (userQuota > maxQuota * 0.9) {
    logWarning('User approaching AI quota limit', {
      userId: 'user-123',
      usage: userQuota,
      limit: maxQuota,
      percentage: (userQuota / maxQuota) * 100,
    });
  }
}

/**
 * Example: Deprecation warnings
 */
export async function exampleDeprecationWarning(endpoint: string) {
  logWarning('Deprecated API endpoint called', {
    endpoint,
    deprecatedSince: '2025-01-01',
    alternative: '/api/v2/articles',
  });
}

// ============================================================================
// INFO LOGGING EXAMPLES
// ============================================================================

/**
 * Example: Track important business events
 */
export async function exampleBusinessEventTracking() {
  const logger = new (await import('./server')).RollbarLogger();

  // Track article publication
  logger.info('Article published', {
    articleId: 'article-123',
    authorId: 'user-456',
    category: 'technology',
    wordCount: 1500,
  });

  // Track user signup
  logger.info('New user registered', {
    userId: 'user-789',
    signupMethod: 'email',
  });

  // Track AI usage
  logger.info('AI feature used', {
    userId: 'user-456',
    feature: 'seo-suggestions',
    tokensUsed: 250,
  });
}

// ============================================================================
// MIDDLEWARE EXAMPLE
// ============================================================================

/**
 * Example: Next.js middleware with Rollbar
 *
 * File: middleware.ts
 */
export function exampleMiddleware(request: NextRequest) {
  const logger = createLoggerFromRequest(request);

  // Track route changes
  logger.info('Middleware executed', {
    pathname: request.nextUrl.pathname,
    method: request.method,
  });

  // Your middleware logic...

  return NextResponse.next();
}

// ============================================================================
// CRON JOB EXAMPLES
// ============================================================================

/**
 * Example: Cron job with Rollbar tracking
 *
 * File: app/api/cron/publish-scheduled/route.ts
 */
export async function exampleCronJob() {
  const logger = new (await import('./server')).RollbarLogger({ cronJob: 'publish-scheduled' });

  try {
    logger.info('Cron job started');

    // Your cron logic...
    const publishedCount = 0;

    logger.info('Cron job completed', {
      articlesPublished: publishedCount,
    });

    return { success: true, published: publishedCount };
  } catch (error) {
    logError(error, {
      cronJob: 'publish-scheduled',
      phase: 'execution',
    });

    return { success: false, error: 'فشل في النشر التلقائي' };
  }
}

// ============================================================================
// PERFORMANCE MONITORING EXAMPLES
// ============================================================================

/**
 * Example: Track slow operations
 */
export async function examplePerformanceTracking() {
  const logger = new (await import('./server')).RollbarLogger();

  const startTime = Date.now();

  try {
    // Do some work...
    await expensiveOperation();

    const duration = Date.now() - startTime;

    // Warn if operation took too long
    if (duration > 5000) {
      logWarning('Slow operation detected', {
        operation: 'expensiveOperation',
        duration,
        threshold: 5000,
      });
    } else {
      logger.info('Operation completed', { duration });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error, { operation: 'expensiveOperation', duration });
    throw error;
  }
}

async function expensiveOperation() {
  // Dummy function
  return new Promise(resolve => setTimeout(resolve, 100));
}

// ============================================================================
// CLIENT-SIDE EXAMPLES (for reference)
// ============================================================================

/**
 * Example: Client-side error boundary
 *
 * File: app/error.tsx
 */
export function exampleErrorBoundary() {
  return `
'use client';

import { Component, ReactNode } from 'react';
import { reportReactError } from '@/lib/rollbar/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Report to Rollbar
    reportReactError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>حدث خطأ ما</h1>;
    }

    return this.props.children;
  }
};
  `;
}

/**
 * Example: Client-side user action tracking
 *
 * File: components/Button.tsx
 */
export function exampleClientTracking() {
  return `
'use client';

import { trackUserAction } from '@/lib/rollbar/client';

export function MyButton() {
  const handleClick = () => {
    // Track button click
    trackUserAction('button_clicked', {
      buttonName: 'publish_article',
      location: 'admin_editor',
    });

    // Your button logic...
  };

  return <button onClick={handleClick}>نشر</button>;
}
  `;
}
