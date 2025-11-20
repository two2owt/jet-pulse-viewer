# Push Notifications Setup Guide

Your app now has native push notification support! This guide covers the setup needed to send notifications on iOS and Android.

## What's Been Implemented

✅ **Push Notification Hook** - Handles registration and permissions  
✅ **Database Integration** - Stores push tokens in `push_subscriptions` table  
✅ **Edge Function** - Backend service to send notifications  
✅ **Geofencing Integration** - Automatic notifications when users enter neighborhoods  
✅ **Settings UI** - Toggle to enable/disable push notifications  
✅ **Haptic Feedback** - Tactile response when notifications arrive  

## Required Setup Steps

### 1. Firebase Cloud Messaging (FCM) for Android

FCM is required to send push notifications to Android devices.

#### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Add an Android app:
   - Package name: `app.lovable.dafac77279084bdb873c58a805d7581e`
   - Download `google-services.json`
4. Get your Server Key:
   - Go to Project Settings → Cloud Messaging
   - Copy the Server Key

#### Add to Supabase Secrets:
In Lovable, add the secret:
- Name: `FCM_SERVER_KEY`
- Value: Your Firebase Server Key

#### Configure Android Project:
After running `npx cap add android`, add to `android/app/google-services.json`:
```json
{
  // Paste the contents of your downloaded google-services.json here
}
```

Update `android/app/build.gradle`:
```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.google.firebase:firebase-messaging:23.0.0'
}
```

### 2. Apple Push Notification Service (APNS) for iOS

APNS is required for iOS push notifications.

#### Steps:
1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Create an App ID (if not exists):
   - Identifier: `app.lovable.dafac77279084bdb873c58a805d7581e`
   - Enable Push Notifications capability
3. Create APNs Key:
   - Certificates, Identifiers & Profiles → Keys
   - Create new key with Apple Push Notifications service (APNs)
   - Download the `.p8` file (save it securely!)
   - Note the Key ID and Team ID

#### Add to Supabase Secrets:
In Lovable, add the secret:
- Name: `APNS_KEY`
- Value: Your .p8 key content

You'll also need:
- `APNS_KEY_ID`: Your Key ID
- `APNS_TEAM_ID`: Your Team ID

#### Configure iOS Project:
After running `npx cap add ios`:

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select your app target
3. Go to Signing & Capabilities
4. Enable Push Notifications capability
5. Add Background Modes capability:
   - Check "Remote notifications"

### 3. Update Capacitor Configuration

Update `capacitor.config.ts`:
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dafac77279084bdb873c58a805d7581e',
  appName: 'jet-pulse-viewer',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
```

## How It Works

### Registration Flow
1. User enables push notifications in Settings
2. App requests permission from iOS/Android
3. Device generates a unique push token
4. Token is saved to `push_subscriptions` table

### Notification Flow
1. User enters a new neighborhood (geofencing)
2. `check-geofence` edge function detects entry
3. Calls `send-push-notification` edge function
4. Notification sent via FCM (Android) or APNS (iOS)
5. User receives notification even if app is closed

### Notification Format
```typescript
{
  title: "Welcome to Downtown!",
  body: "3 active deals nearby",
  data: {
    neighborhoodId: "uuid",
    dealId: "uuid",
  }
}
```

## Testing Push Notifications

### Test on Physical Device
Push notifications only work on physical devices, not simulators!

1. Build and run on your device:
   ```bash
   npm run build
   npx cap sync
   npx cap open ios  # or android
   ```

2. Enable push notifications in Settings

3. Move to a new neighborhood to trigger automatic notification

4. Or manually test with the edge function:
   ```typescript
   await supabase.functions.invoke('send-push-notification', {
     body: {
       title: 'Test Notification',
       body: 'This is a test',
       user_ids: ['your-user-id'],
     },
   });
   ```

## Troubleshooting

### Android Issues
- **No token received**: Check Firebase setup and `google-services.json`
- **Permission denied**: Make sure to request permission in app
- **Not receiving**: Verify FCM Server Key in Supabase secrets

### iOS Issues
- **No token received**: Check APNS setup and capabilities in Xcode
- **Permission denied**: Request permission and check Info.plist
- **Not receiving**: Verify APNS key/credentials in Supabase secrets

### General
- **Test on device**: Simulators don't support push notifications
- **Check logs**: Use `npx cap open [platform]` and check native logs
- **Verify tokens**: Check `push_subscriptions` table for saved tokens

## Database Schema

The `push_subscriptions` table stores:
- `user_id`: User who owns the subscription
- `endpoint`: The push token from FCM/APNS
- `p256dh_key`: Encryption key (not used for native)
- `auth_key`: Auth key (not used for native)
- `active`: Whether subscription is active

## Advanced Features

### Custom Notification Channels (Android)
Add notification channels in `android/app/src/main/java/.../MainActivity.java`:
```java
import android.app.NotificationChannel;
import android.app.NotificationManager;

// In onCreate
NotificationChannel channel = new NotificationChannel(
    "deals",
    "Deals & Events",
    NotificationManager.IMPORTANCE_HIGH
);
getSystemService(NotificationManager.class).createNotificationChannel(channel);
```

### Rich Notifications (iOS)
Add a Notification Service Extension for images and actions.

### Badge Count
Update badge count when notifications arrive:
```typescript
import { Badge } from '@capacitor/badge';
await Badge.increase();
```

## Next Steps

✅ Add Firebase project and configure FCM  
✅ Set up APNS keys and configure iOS project  
✅ Add secrets to Supabase (FCM_SERVER_KEY, APNS_KEY)  
✅ Test on physical devices  
✅ Customize notification content and actions  

Your app now has full native push notification support! 🔔
