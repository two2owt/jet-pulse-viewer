import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Only initialize on native platforms (iOS/Android)
    const nativePlatform = Capacitor.isNativePlatform();
    setIsNative(nativePlatform);
    
    if (nativePlatform) {
      initializePushNotifications();
    } else {
      console.log('Push notifications only available on native iOS/Android apps');
    }
  }, []);

  const initializePushNotifications = async () => {
    // Double-check we're on a native platform
    if (!Capacitor.isNativePlatform()) {
      console.log('Skipping push notification initialization on web');
      return;
    }

    try {
      // Request permission
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
        
        setIsRegistered(true);
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }

    // Set up event listeners
    setupListeners();
  };

  const setupListeners = () => {
    // Only set up listeners on native platforms
    if (!Capacitor.isNativePlatform()) return;

    // On registration success, save the token
    PushNotifications.addListener('registration', async (tokenData: Token) => {
      console.log('Push registration success, token:', tokenData.value);
      setToken(tokenData.value);
      await saveTokenToDatabase(tokenData.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
      toast.error('Failed to register for push notifications');
    });

    // When a notification is received while app is open
    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        await triggerHaptic('success');
        
        toast(notification.title || 'New notification', {
          description: notification.body,
          duration: 5000,
        });
      }
    );

    // When user taps on a notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (notification: ActionPerformed) => {
        console.log('Push notification action performed:', notification);
        await triggerHaptic('medium');
        
        // Handle navigation based on notification data
        if (notification.notification.data?.dealId) {
          // Navigate to deal details
          console.log('Navigate to deal:', notification.notification.data.dealId);
        }
      }
    );
  };

  const saveTokenToDatabase = async (pushToken: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No user session, cannot save push token');
        return;
      }

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('endpoint', pushToken)
        .eq('user_id', session.user.id)
        .single();

      if (existingToken) {
        // Update existing token to active
        await supabase
          .from('push_subscriptions')
          .update({ active: true })
          .eq('id', existingToken.id);
      } else {
        // Insert new token
        await supabase
          .from('push_subscriptions')
          .insert({
            user_id: session.user.id,
            endpoint: pushToken,
            p256dh_key: 'native-app', // Native apps don't use web push encryption
            auth_key: 'native-app',
            active: true,
          });
      }

      console.log('Push token saved to database');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const unregister = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on web');
      return;
    }

    try {
      await PushNotifications.removeAllListeners();
      
      // Mark token as inactive in database
      if (token) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('endpoint', token)
            .eq('user_id', session.user.id);
        }
      }
      
      setIsRegistered(false);
      setToken(null);
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    const result = await PushNotifications.checkPermissions();
    return result.receive === 'granted';
  };

  return {
    isRegistered,
    token,
    isNative,
    initializePushNotifications,
    unregister,
    checkPermissions,
  };
};
