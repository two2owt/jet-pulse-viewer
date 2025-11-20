/**
 * Haptic feedback utilities for enhanced user experience
 * Uses Capacitor Haptics API for native iOS/Android support
 * Gracefully degrades on web platforms
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'glide' | 'soar';

/**
 * Check if native haptics are supported
 * Returns false on web platforms
 */
export const isHapticSupported = async (): Promise<boolean> => {
  // Haptics only work on native platforms
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // Test if Capacitor Haptics is available on iOS and Android
    await Haptics.impact({ style: ImpactStyle.Light });
    return true;
  } catch (error) {
    console.debug('Native haptic feedback not available');
    return false;
  }
};

/**
 * Trigger haptic feedback with a predefined pattern
 * Silently fails on web platforms
 */
export const triggerHaptic = async (pattern: HapticPattern = 'light'): Promise<void> => {
  // Skip on web platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    switch (pattern) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'glide':
        await glideHaptic();
        break;
      case 'soar':
        await soarHaptic();
        break;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (error) {
    console.error('Error triggering haptic feedback:', error);
  }
};

/**
 * Trigger custom haptic feedback with a custom intensity
 * Silently fails on web platforms
 */
export const triggerCustomHaptic = async (style: ImpactStyle = ImpactStyle.Medium): Promise<void> => {
  // Skip on web platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.error('Error triggering custom haptic feedback:', error);
  }
};

/**
 * Create a smooth gliding haptic pattern
 * Simulates a smooth, continuous gliding motion with graduated impacts
 * Silently fails on web platforms
 */
export const glideHaptic = async (): Promise<void> => {
  // Skip on web platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Create a smooth gliding sensation with increasing then decreasing intensity
    await Haptics.impact({ style: ImpactStyle.Light });
    await new Promise(resolve => setTimeout(resolve, 50));
    await Haptics.impact({ style: ImpactStyle.Light });
    await new Promise(resolve => setTimeout(resolve, 50));
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(resolve => setTimeout(resolve, 50));
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(resolve => setTimeout(resolve, 50));
    await Haptics.impact({ style: ImpactStyle.Light });
    await new Promise(resolve => setTimeout(resolve, 50));
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Error triggering glide haptic:', error);
  }
};

/**
 * Create a soaring haptic pattern
 * Simulates the sensation of soaring or taking flight with crescendo effect
 * Silently fails on web platforms
 */
export const soarHaptic = async (): Promise<void> => {
  // Skip on web platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Create a soaring sensation with building intensity
    await Haptics.impact({ style: ImpactStyle.Light });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Light });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise(resolve => setTimeout(resolve, 60));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Medium });
    await new Promise(resolve => setTimeout(resolve, 40));
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Error triggering soar haptic:', error);
  }
};

/**
 * React hook for haptic feedback
 */
export const useHaptic = () => {
  return {
    trigger: triggerHaptic,
    triggerCustom: triggerCustomHaptic,
    glide: glideHaptic,
    soar: soarHaptic,
    isSupported: isHapticSupported,
  };
};
