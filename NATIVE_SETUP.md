# Native Mobile App Setup Guide

Your app is now configured for native iOS and Android development with Capacitor! Follow these steps to build and run your app on physical devices or emulators.

## What's Been Configured

✅ **Capacitor Core** - Native runtime and bridge  
✅ **iOS & Android Platforms** - Ready for native builds  
✅ **Native Haptics** - iOS/Android haptic feedback using Capacitor Haptics plugin  
✅ **Hot Reload** - Develop and test with live updates from Lovable  

## Prerequisites

### For iOS Development (Mac only)
- macOS computer
- Xcode (latest version from Mac App Store)
- iOS Simulator or physical iPhone

### For Android Development
- Android Studio (download from https://developer.android.com/studio)
- Android SDK and emulator (installed via Android Studio)
- Physical Android device (optional)

## Setup Steps

### 1. Export Your Project to GitHub
Click the "Export to Github" button in Lovable to push your code to a repository.

### 2. Clone Your Repository Locally
```bash
git clone <your-repo-url>
cd jet-pulse-viewer
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build Your Web App
```bash
npm run build
```

### 5. Add Native Platforms

**For iOS:**
```bash
npx cap add ios
```

**For Android:**
```bash
npx cap add android
```

### 6. Sync Your Project
This copies the built web app and plugins to the native projects:
```bash
npx cap sync
```

### 7. Open and Run in Native IDE

**For iOS:**
```bash
npx cap open ios
```
Then in Xcode:
- Select a simulator or connected device
- Click the Play button to build and run

**For Android:**
```bash
npx cap open android
```
Then in Android Studio:
- Select an emulator or connected device
- Click the Run button to build and run

## Development Workflow

### Live Development with Hot Reload
Your Capacitor config is set up to load from the Lovable preview URL, so you can:
1. Make changes in Lovable
2. The app on your device/emulator will automatically refresh
3. Test native features like haptics in real-time!

### When You're Ready to Deploy
Update `capacitor.config.ts` to use the local build:
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.dafac77279084bdb873c58a805d7581e',
  appName: 'jet-pulse-viewer',
  webDir: 'dist',
  // Remove or comment out the server section
  // server: { ... }
};
```

Then run:
```bash
npm run build
npx cap sync
```

## Testing Native Features

### Haptic Feedback
The app now uses native haptics! Test it by:
1. Clicking "Get Directions" on a venue (glide haptic)
2. Selecting a navigation app (soar haptic)

You should feel the haptics on physical iOS/Android devices.

### Other Native Features Available
With Capacitor, you can now add:
- **Push Notifications** - `@capacitor/push-notifications`
- **Camera** - `@capacitor/camera`
- **Geolocation** - `@capacitor/geolocation`
- **File System** - `@capacitor/filesystem`
- **Share** - `@capacitor/share`
- **Status Bar** - `@capacitor/status-bar`
- And many more plugins!

## Troubleshooting

### iOS Issues
- **Build Errors**: Make sure Xcode is up to date
- **Signing**: You'll need to configure signing in Xcode (free with Apple ID)
- **Permissions**: Update `ios/App/App/Info.plist` for location/camera permissions

### Android Issues
- **SDK Not Found**: Install Android SDK via Android Studio
- **Build Errors**: Update Gradle if prompted
- **Permissions**: Update `android/app/src/main/AndroidManifest.xml` for permissions

### General
- Always run `npx cap sync` after installing new plugins
- Run `npm run build` before syncing to update web assets
- Check the Capacitor docs: https://capacitorjs.com/docs

## Next Steps After Each Code Change in Lovable

Whenever you make changes in Lovable and want to test on native:
```bash
git pull                    # Get latest changes
npm install                 # Install any new dependencies
npm run build              # Build the web app
npx cap sync               # Sync to native projects
```

That's it! Your app is now a native mobile app with full access to device features. 🚀
