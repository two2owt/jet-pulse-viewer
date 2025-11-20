/**
 * Haptic feedback utilities for enhanced user experience
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'glide' | 'soar';

interface VibrationPattern {
  pattern: number | number[];
  description: string;
}

const HAPTIC_PATTERNS: Record<HapticPattern, VibrationPattern> = {
  light: {
    pattern: 10,
    description: 'Quick, subtle tap',
  },
  medium: {
    pattern: 20,
    description: 'Medium intensity tap',
  },
  heavy: {
    pattern: 40,
    description: 'Strong, pronounced tap',
  },
  success: {
    pattern: [10, 50, 10],
    description: 'Double tap for success',
  },
  warning: {
    pattern: [20, 100, 20, 100, 20],
    description: 'Three taps for warning',
  },
  error: {
    pattern: [50, 100, 50, 100, 50],
    description: 'Strong triple tap for error',
  },
  glide: {
    pattern: [5, 10, 10, 10, 15, 10, 20, 10, 15, 10, 10, 10, 5],
    description: 'Smooth gliding sensation with gentle build and fade',
  },
  soar: {
    pattern: [3, 8, 5, 8, 8, 8, 12, 8, 15, 8, 18, 8, 15, 8, 12, 8, 8, 8, 5, 8, 3],
    description: 'Smooth soaring sensation like taking flight',
  },
};

/**
 * Check if the Vibration API is supported
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback with a predefined pattern
 */
export const triggerHaptic = (pattern: HapticPattern = 'light'): void => {
  if (!isHapticSupported()) {
    console.debug('Haptic feedback not supported on this device');
    return;
  }

  try {
    const hapticPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(hapticPattern.pattern);
  } catch (error) {
    console.error('Error triggering haptic feedback:', error);
  }
};

/**
 * Trigger custom haptic feedback with a custom pattern
 */
export const triggerCustomHaptic = (pattern: number | number[]): void => {
  if (!isHapticSupported()) {
    console.debug('Haptic feedback not supported on this device');
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('Error triggering custom haptic feedback:', error);
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = (): void => {
  if (!isHapticSupported()) return;
  
  try {
    navigator.vibrate(0);
  } catch (error) {
    console.error('Error canceling haptic feedback:', error);
  }
};

/**
 * Create a smooth gliding haptic pattern
 * Simulates a smooth, continuous gliding motion
 */
export const glideHaptic = (): void => {
  triggerHaptic('glide');
};

/**
 * Create a soaring haptic pattern
 * Simulates the sensation of soaring or taking flight
 */
export const soarHaptic = (): void => {
  triggerHaptic('soar');
};

/**
 * React hook for haptic feedback
 */
export const useHaptic = () => {
  const supported = isHapticSupported();

  return {
    supported,
    trigger: triggerHaptic,
    triggerCustom: triggerCustomHaptic,
    cancel: cancelHaptic,
    glide: glideHaptic,
    soar: soarHaptic,
  };
};
