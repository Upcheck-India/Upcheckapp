/// <reference types="node" />
const TRUECALLER_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_TRUECALLER_ANDROID_CLIENT_ID || 'e98dcupeqtmcocbxr7qb4g7b4sub8blazhxrt-1ikmw';

export default {
  expo: {
    name: "upcheck",
    slug: "upcheck",
    version: "1.0.0",
    scheme: "upcheckapp",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.upcheck.app"
    },
    android: {
      package: "com.upcheck.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "upcheckapp"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://hporygudvkfoegxzsivt.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3J5Z3Vkdmtmb2VneHpzaXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTQ5NzUsImV4cCI6MjA4NTE5MDk3NX0.UzR8k_53nERSiEMbYPF4eOVvYCDDaE6onNWGUptbInc",
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://upcheckapp-c612.onrender.com/api",
      googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "39325535525-aviskbmsicrapi6akc28qa8ed7mqhuki.apps.googleusercontent.com",
      googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "557249592391-smcje08fcv71hh1vjhmshhvnklpmd7lo.apps.googleusercontent.com",
      googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || "557249592391-omumak2q0qnor86nj47m93ln4fsn8uv3.apps.googleusercontent.com",
      truecallerAndroidClientId: TRUECALLER_ANDROID_CLIENT_ID,
      truecallerIosAppKey: process.env.EXPO_PUBLIC_TRUECALLER_IOS_APP_KEY || '',
      truecallerIosAppLink: process.env.EXPO_PUBLIC_TRUECALLER_IOS_APP_LINK || '',
      eas: {
        projectId: "f3274022-ae8a-4be6-9085-23f935542a4c"
      },
    },
    owner: "utpl-in",
    plugins: [
      "expo-font",
      [
        "expo-notifications",
        {
          // Android small icon MUST be a white-on-transparent silhouette (Android
          // masks by alpha + tints with `color`); a full-colour icon collapses to
          // a solid square. `notification-icon.png` is the white shrimp mark.
          icon: "./assets/notification-icon.png",
          color: "#0D84D6"
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow UpCheck to use the camera to scan a worker's QR code."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow UpCheck to use your location to set your farm position for weather, tide and regional pricing features."
        }
      ],
      "@react-native-google-signin/google-signin",
      // Injects <meta-data android:name="com.truecaller.android.sdk.ClientId">
      // into the Android manifest so the native Truecaller SDK can initialize.
      // Without this, isUsable()/authenticate() fail (no client id at runtime).
      [
        "./node_modules/@dhana-cs/react-native-truecaller/plugins/withTruecaller.js",
        { clientId: TRUECALLER_ANDROID_CLIENT_ID }
      ]
    ],
    runtimeVersion: "1.0.0",
    updates: {
      url: "https://u.expo.dev/f3274022-ae8a-4be6-9085-23f935542a4c"
    }
  }
};
