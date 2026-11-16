# Hilt on iOS and Android

The native projects bundle the React app in this directory and use the same API as the website. A new install opens at sign-in. After a successful login it opens My clubs, or the event or check-in link that launched it. On later launches it restores the session from the device’s secure storage.

Use Node 22 or later, Xcode 26 or later for iOS, or JDK 21 and Android SDK 36 for Android. The QR scanner requires Android API 26 or later on the device.

```sh
cd apps/frontend
npm ci
cp .env.mobile.example .env.mobile.local
npm run mobile:sync
npx cap open ios
npx cap open android
```

Set `VITE_HILT_API_ORIGIN` to the HTTPS origin serving the API from this branch. Set `VITE_HILT_WEB_ORIGIN` to the HTTPS origin users should see in shared event links and event QR codes. The example points both at Hilt’s public hostname. Run `npm run mobile:sync` after changing either value or rebuilding the web UI.

To run against a local API on port 3020 from the Android emulator:

```sh
VITE_HILT_WEB_ORIGIN=https://hilt.paolini.dev \
VITE_HILT_API_ORIGIN=http://10.0.2.2:3020 npm run mobile:sync:local -- android
cd android
./gradlew :app:installDebug
```

The local sync enables HTTP for debug testing. Run the HTTPS sync again before preparing a beta or release build. Use a reachable HTTPS API for physical devices and iOS testing.

## Links from other apps

Shared event links and event QR links are ordinary HTTPS links. They open the web app when the device has no verified association with the native app. The native projects are configured for `hilt.paolini.dev` and use the package identifier `dev.paolini.hilt`.

- **iOS.** Select the signing team in Xcode. Serve `/.well-known/apple-app-site-association` on the public web origin. Under `applinks.details`, use the app’s actual `<Team ID>.dev.paolini.hilt` identifier and match `/`, `/scan`, and `/organizations/*`.
- **Android.** Serve `/.well-known/assetlinks.json` on the public web origin. Use the `delegate_permission/common.handle_all_urls` relation, package `dev.paolini.hilt`, and the SHA-256 fingerprint of the signing certificate used by the installed build.

For a different public hostname, use the same hostname in the mobile environment, the iOS `HILT_WEB_HOST` build setting, and the Android `hiltWebHost` Gradle property. See the [Capacitor deep link guide](https://capacitorjs.com/docs/guides/deep-links) for the association file formats.
