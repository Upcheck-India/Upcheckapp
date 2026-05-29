# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Truecaller SDK 2.6.0 — keep rules (Requirement 4.6)
# Preserve all classes, interfaces, and members in the Truecaller SDK so that
# reflection-based deserialization of TrueProfile, callbacks, and signed
# payload fields continue to work after R8 / ProGuard minification.
-keep class com.truecaller.android.sdk.** { *; }
-keep interface com.truecaller.android.sdk.** { *; }
-dontwarn com.truecaller.android.sdk.**
