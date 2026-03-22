/**
 * Rollbar Export Index
 *
 * Re-export all Rollbar functionality for convenient importing
 *
 * Usage:
 * import { rollbar, logger, logError } from '@/lib/rollbar';
 */

// Server-side exports
export {
  rollbar,
  logMessage,
  logError,
  logCritical,
  logWarning,
  logInfo,
  logDebug,
  setRollbarUser,
  clearRollbarUser,
  addRollbarData,
  RollbarLogger,
  createLoggerFromRequest,
  isRollbarConfigured,
  logger as serverLogger,
  type LogLevel,
} from './server';

// Client-side exports
export {
  rollbar as clientRollbar,
  logMessage as clientLogMessage,
  logError as clientLogError,
  logCritical as clientLogCritical,
  logWarning as clientLogWarning,
  logInfo as clientLogInfo,
  logDebug as clientLogDebug,
  setRollbarUser as setClientRollbarUser,
  clearRollbarUser as clearClientRollbarUser,
  addRollbarData as addClientRollbarData,
  RollbarLogger as ClientRollbarLogger,
  isRollbarConfigured as isClientRollbarConfigured,
  logger as clientLogger,
  reportReactError,
  trackUserAction,
  trackNavigation,
  trackRequest,
} from './client';

// Examples
export * from './examples';
