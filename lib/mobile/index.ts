/**
 * Mobile Utilities Module
 * Exports all mobile-specific utilities and helpers
 */

export {
  triggerHaptic,
  hapticPress,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticImpact,
  isHapticSupported,
  useHaptic,
  type HapticPattern,
} from './haptic-feedback';

export {
  useSwipeGestures,
  useSwipeNavigation,
  SwipeGestures,
  type SwipeHandlers,
  type SwipeGesturesOptions,
} from './swipe-gestures';
