/**
 * Haptic Feedback Utilities for Mobile
 * Provides vibration feedback for user actions on supported devices
 */

export type HapticPattern =
  | 'light'     // Short, light feedback
  | 'medium'    // Medium feedback
  | 'heavy'     // Strong feedback
  | 'success'   // Success pattern (two short pulses)
  | 'error'     // Error pattern (long pulse)
  | 'warning'   // Warning pattern (three short pulses)
  | 'selection' // Selection feedback (for taps/clicks)
  | 'impact'    // Impact feedback (for important actions);

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback with a specific pattern
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (!isHapticSupported()) return;

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 10],
    error: 100,
    warning: [10, 50, 10, 50, 10],
    selection: 5,
    impact: 75,
  };

  const vibrationPattern = patterns[pattern];
  navigator.vibrate(vibrationPattern);
}

/**
 * Trigger haptic feedback for button press
 */
export function hapticPress(): void {
  triggerHaptic('selection');
}

/**
 * Trigger haptic feedback for success action
 */
export function hapticSuccess(): void {
  triggerHaptic('success');
}

/**
 * Trigger haptic feedback for error action
 */
export function hapticError(): void {
  triggerHaptic('error');
}

/**
 * Trigger haptic feedback for warning
 */
export function hapticWarning(): void {
  triggerHaptic('warning');
}

/**
 * Trigger haptic feedback for important action (publish, delete, etc.)
 */
export function hapticImpact(): void {
  triggerHaptic('impact');
}

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
  const supported = isHapticSupported();

  return {
    supported,
    trigger: triggerHaptic,
    press: () => triggerHaptic('selection'),
    success: () => triggerHaptic('success'),
    error: () => triggerHaptic('error'),
    warning: () => triggerHaptic('warning'),
    impact: () => triggerHaptic('impact'),
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
  };
}
