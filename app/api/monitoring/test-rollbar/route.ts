/**
 * Rollbar Test Endpoint
 *
 * Tests Rollbar error tracking by sending a test error.
 * Access this endpoint at: /api/monitoring/test-rollbar
 *
 * This will send a test error to Rollbar to verify your configuration is working.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rollbar, logError, logWarning, logInfo, logCritical, isRollbarConfigured } from '@/lib/rollbar';

/**
 * Helper to send Rollbar error and wait for response
 */
function sendToRollbar(level: string, data: unknown): Promise<{ success: boolean; err?: unknown }> {
  return new Promise((resolve) => {
    const callback = (err: unknown) => {
      if (err) {
        console.error('Rollbar send error:', err);
        resolve({ success: false, err });
      } else {
        console.log('Rollbar send successful');
        resolve({ success: true });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    switch (level) {
      case 'info':
        rollbar.info('Rollbar test - Info message', d, callback);
        break;
      case 'warning':
        rollbar.warning('Rollbar test - Warning message', d, callback);
        break;
      case 'critical':
        rollbar.critical('Rollbar test - Critical error', new Error('Test critical error'), d, callback);
        break;
      case 'error':
      default: {
        const testError = new Error('Rollbar test error from /api/monitoring/test-rollbar');
        rollbar.error(testError, d, callback);
        break;
      }
    }
  });
}

export async function GET(request: NextRequest) {
  const configStatus = isRollbarConfigured();
  const environment = process.env.ROLLBAR_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const tokenProvided = !!process.env.ROLLBAR_ACCESS_TOKEN;
  const tokenLength = process.env.ROLLBAR_ACCESS_TOKEN?.length || 0;
  const rollbarEnabled = process.env.ROLLBAR_ENABLED === 'true' || process.env.NODE_ENV === 'production';

  // Send different test messages based on query param
  const level = request.nextUrl.searchParams.get('level') || 'error';
  const verbose = request.nextUrl.searchParams.get('verbose') === 'true';

  // Enable verbose logging for debugging
  if (verbose) {
    rollbar.configure({ verbose: true });
  }

  const testData = {
    testEndpoint: true,
    timestamp: new Date().toISOString(),
    environment,
    message: 'This is a test error to verify Rollbar is working correctly',
  };

  try {
    // Check if Rollbar is enabled
    if (!rollbarEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Rollbar is disabled',
        details: 'Set ROLLBAR_ENABLED=true in your .env file to enable Rollbar in development',
        config: {
          configured: configStatus,
          tokenProvided,
          tokenLength,
          environment,
          rollbarEnabled,
        },
      }, { status: 400 });
    }

    // Send to Rollbar and wait for the callback
    const result = await sendToRollbar(level, testData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send to Rollbar',
        details: result.err instanceof Error ? result.err.message : String(result.err),
        config: {
          configured: configStatus,
          tokenProvided,
          tokenLength,
          environment,
          rollbarEnabled,
        },
        troubleshooting: [
          'Check your ROLLBAR_ACCESS_TOKEN is correct',
          'Check your network connection',
          'Verify the token has "post_server_item" scope',
          'Try visiting https://rollbar.com to confirm your account is active',
        ],
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test ${level} sent to Rollbar successfully`,
      rollbarResponse: result,
      config: {
        configured: configStatus,
        tokenProvided,
        tokenLength,
        environment,
        rollbarEnabled,
      },
      instructions: [
        '1. Check your Rollbar dashboard at https://rollbar.com',
        '2. Look for a new item with message: "Rollbar test - ..."',
        '3. The error should appear within a few seconds',
        `4. Environment: ${environment}`,
        '5. If you still don\'t see it, your access token may be invalid',
      ],
      debugInfo: {
        accessToken: tokenProvided ? `${process.env.ROLLBAR_ACCESS_TOKEN?.substring(0, 8)}...` : 'not set',
        endpoint: 'https://api.rollbar.com/api/1/item/',
      },
    });

  } catch (error) {
    // If Rollbar itself fails, return error details
    return NextResponse.json({
      success: false,
      error: 'Failed to send test to Rollbar',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        configured: configStatus,
        tokenProvided,
        tokenLength,
        environment,
        rollbarEnabled,
      },
    }, { status: 500 });
  }
}

// Also support POST for testing from forms
export async function POST(request: NextRequest) {
  return GET(request);
}
