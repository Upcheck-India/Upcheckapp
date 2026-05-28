# Truecaller SDK — React Native Integration Guide

**Target:** React Native app | Market: India | Mode: TC users + non-TC users with OTP fallback  
**SDK Version:** `truecaller-sdk:2.6.0` (Legacy v2.x — the only version officially wrapped for RN)

---

## ⚠️ Read This First — Three Things That Will Save You Days

1. **React Native uses LEGACY SDK 2.x, not OAuth 3.0.** Truecaller's Flutter/Android-native SDKs moved to OAuth 3.0 with `ClientId`. The RN bridge is still on v2.x with `PartnerKey`. Don't mix tutorials — if a guide mentions `TcSdk`, `getAuthorizationCode`, or `codeVerifier`, it's OAuth 3.0 and **not for us**.

2. **The official "react-native-sdk" repo is NOT an npm package.** It's a documentation repo with Java bridge code you copy into your Android project. There is no `npm install` step for the official SDK. You write the native bridge yourself.

3. **Server-side signature validation is non-optional.** The SDK returns a signed payload. If you trust the client-side response without verifying the signature on your backend, your auth is bypassable. We'll cover this.

---

## 🛡️ How to Use the Verification Gates

Every critical step in this guide ends with a **Verification Gate**. Treat them as hard stops:

> **🚦 Rule:** Do not proceed past a gate until it passes. Auth bugs caught at the gate cost minutes. The same bugs caught after release cost weeks and trust.

Each gate has four parts:

- **✅ Check** — what to run / look at
- **✓ Expected** — what success looks like exactly
- **❌ Common failures** — what you might see instead, and why
- **🔧 Recovery** — how to fix and retry

If a gate fails and the recovery doesn't help, **stop and isolate** before touching the next step. Adding more bricks on top of a cracked one multiplies the debug surface.

---

## Part 1: How Truecaller Auth Actually Works

There are **two flows** wrapped inside one SDK:

### Flow A — One-Tap (Truecaller user, app installed + logged in)
1. User taps your "Continue with Truecaller" button.
2. Bottom sheet shows their TC profile (name, number).
3. User taps "Continue" → you get profile + signed payload.
4. **No OTP. No SMS. No waiting.** ~2 seconds.

### Flow B — Manual Verification (no Truecaller app)
1. SDK invokes `onVerificationRequired`.
2. You collect phone number from user.
3. SDK initiates verification — Truecaller's backend picks **missed call** OR **OTP via SMS** OR **OTP via WhatsApp (IM OTP)** depending on user/device.
4. You receive callbacks for each stage.
5. User enters OTP (or you auto-detect missed call) → you call `verifyOtp` or `verifyMissedCall` with their name.
6. You get access token + profile.

Since you said **both TC + non-TC users**, you'll use `SDK_OPTION_WITH_OTP`.

---

## Part 2: Prerequisites & Truecaller Console Setup

### 2.1 Create a developer account

Go to **https://developer.truecaller.com** and sign up. You'll create an "App" entry.

### 2.2 Generate your SHA-1 fingerprints (BOTH debug AND release)

You need to register **two SHA-1 fingerprints** for the same package name — one for debug builds, one for release. Skip this and you'll get `ERROR_TYPE_UNAUTHORIZED_PARTNER` every time.

**Debug SHA-1** (auto-generated keystore on your machine):
```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Release SHA-1** (your production keystore):
```bash
keytool -list -v -keystore /path/to/your-release.keystore -alias your-key-alias
```

Look for the line: `SHA1: AA:BB:CC:DD:...` — copy the full colon-separated string.

**If you publish to Play Store with Play App Signing**, you also need the SHA-1 from Play Console → Setup → App integrity → App signing key certificate. That's the *real* SHA-1 your installed app will have.

> ### ✅ Verification Gate 2.2 — SHA-1 captured correctly
>
> **Check:** Run the cleaner gradle-based command from inside your `android/` folder:
> ```bash
> cd android && ./gradlew signingReport
> ```
>
> **✓ Expected:** You see at least two variants (`debug` and `release` if release is configured), each showing:
> ```
> Variant: debug
> Config: debug
> Store: /Users/you/.android/debug.keystore
> Alias: AndroidDebugKey
> SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
> SHA-256: ...
> ```
> The SHA1 line is exactly **40 hex chars + 19 colons = 59 chars total**.
>
> **❌ "Keystore was tampered with, or password was incorrect":** Default debug password is `android`. For your release keystore, use the password you set when creating it.
>
> **❌ No `release` variant shown:** Release signingConfig isn't wired up in `android/app/build.gradle`. Add a `signingConfigs.release { ... }` block before continuing — you'll need this for production anyway.
>
> **❌ SHA1 is uppercase vs lowercase concern:** Doesn't matter. Truecaller console normalizes case. Colons are required though.
>
> **🔧 Save both SHA-1s to a notepad now.** You'll paste them in the next step, and again later when debugging "ERROR_PROFILE_NOT_FOUND."

### 2.3 Register the app on Truecaller console

In the console, create an app with:
- **Package name**: must match `applicationId` in `android/app/build.gradle` exactly
- **SHA-1 fingerprint**: paste the one(s) from step 2.2

Truecaller will issue you an **App Key** (also called Partner Key). Copy it — looks like `xyz123abc456...`.

> ### ✅ Verification Gate 2.3 — App registered, Partner Key obtained
>
> **Check:** On the Truecaller developer console, your app entry shows:
> 1. Package name **character-for-character identical** to your `applicationId` in `android/app/build.gradle`
> 2. Both debug AND release SHA-1s listed (if you have a release build)
> 3. An **App Key** (Partner Key) visible — typically 40+ alphanumeric characters
> 4. App status shows "Active" or "Development" (not "Pending Review" for testing)
>
> **✓ Expected:** Console page looks like:
> ```
> App Name:      YourApp
> Package:       com.yourapp
> Status:        Active
> App Key:       xyz123abc456def789...
> SHA-1 (debug): A1:B2:C3:D4:...
> SHA-1 (rel):   E5:F6:G7:H8:...
> ```
>
> **❌ Package name mismatch (even one character):** You will get `ERROR_PROFILE_NOT_FOUND` at runtime with no other clue. Run `grep applicationId android/app/build.gradle` and compare letter-by-letter.
>
> **❌ "App Key" field empty:** Hit refresh on the console; key generation can take 30–60s after registration.
>
> **🔧 Treat the Partner Key as a secret.** Don't paste it in this chat, in PR descriptions, or commit it to git. It identifies your app to Truecaller's servers.

### 2.4 Register test phone numbers

During development, only **registered test numbers** can complete verification successfully. Add 3–5 dev/QA numbers in the console under "Test numbers."

### 2.5 (Optional but recommended) Configure SMS Retriever hash

If you want auto-OTP read (no SMS permission needed), generate your app's SMS Retriever hash and add it to the console. We'll cover this in Part 9.

---

## Part 3: Android Native Setup

### 3.1 Add the dependency

Open `android/app/build.gradle`:

```gradle
android {
    // ...
    defaultConfig {
        // ...
        minSdkVersion 21  // Truecaller SDK requires API 16+, but RN itself needs 21+
    }
}

dependencies {
    implementation "com.truecaller.android.sdk:truecaller-sdk:2.6.0"
    // ... your other deps
}
```

Sync gradle. If you see a duplicate-class error from `okhttp` or `retrofit`, you likely already have them — Truecaller SDK pulls them transitively. It's usually fine.

> ### ✅ Verification Gate 3.1 — Truecaller SDK resolved by Gradle
>
> **Check:** From inside `android/`, run:
> ```bash
> ./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep -i truecaller
> ```
>
> **✓ Expected:** You see (at least) this line in the output:
> ```
> +--- com.truecaller.android.sdk:truecaller-sdk:2.6.0
> ```
> Plus transitive deps (okhttp, retrofit, gson) underneath it.
>
> **❌ "Could not resolve com.truecaller.android.sdk:truecaller-sdk":** Your project doesn't have `mavenCentral()` in `android/build.gradle`'s `allprojects.repositories`. Add it:
> ```gradle
> allprojects {
>     repositories {
>         google()
>         mavenCentral()  // ← Truecaller SDK lives here
>     }
> }
> ```
>
> **❌ "Duplicate class okhttp3.Address":** Exclude okhttp from one source. See Part 11, issue #4.
>
> **❌ Output is empty (no truecaller line):** Either gradle sync didn't run (Android Studio: File → Sync Project with Gradle Files) or you put the dependency in the wrong build.gradle. It must be in `android/app/build.gradle`, NOT `android/build.gradle`.
>
> **🔧 Do a clean build before continuing:** `./gradlew clean && ./gradlew assembleDebug`. This must succeed before you touch any Java files.

### 3.2 Store the Partner Key

Open `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">YourApp</string>
    <string name="partnerKey">PASTE_YOUR_APP_KEY_HERE</string>
</resources>
```

**Never commit the actual key to a public repo.** Use a separate `partner-keys.xml` that's gitignored, or load via `BuildConfig` from `local.properties`.

### 3.3 Update AndroidManifest.xml

`android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourapp">

    <!-- Required for OTP fallback flow (SDK_OPTION_WITH_OTP) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    
    <!-- For Android 8+ (API 26+) -->
    <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
    
    <!-- For Android 7 and below -->
    <uses-permission android:name="android.permission.CALL_PHONE" />
    
    <!-- Optional: if using SMS Retriever for auto-OTP -->
    <uses-permission android:name="android.permission.RECEIVE_SMS" />

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher">

        <!-- Partner Key metadata -->
        <meta-data
            android:name="com.truecaller.android.sdk.PartnerKey"
            android:value="@string/partnerKey" />

        <activity
            android:name=".MainActivity"
            android:launchMode="singleTask"
            android:exported="true">
            <!-- ... your intent filters ... -->
        </activity>
    </application>
</manifest>
```

**Why `singleTask`?** Truecaller's verification flow can return to your app via deep-link callbacks. `singleTask` prevents duplicate activity instances breaking the callback chain.

> ### ✅ Verification Gate 3.3 — Manifest & strings.xml correct
>
> **Check 1 — strings.xml has the key:**
> ```bash
> grep -A1 "partnerKey" android/app/src/main/res/values/strings.xml
> ```
> **✓ Expected:** Shows your actual key, not the placeholder `PASTE_YOUR_APP_KEY_HERE`.
>
> **Check 2 — Manifest references the key via @string:**
> ```bash
> grep -A1 "com.truecaller.android.sdk.PartnerKey" android/app/src/main/AndroidManifest.xml
> ```
> **✓ Expected:**
> ```xml
> <meta-data
>     android:name="com.truecaller.android.sdk.PartnerKey"
>     android:value="@string/partnerKey" />
> ```
> Note the value uses `@string/partnerKey`, NOT the raw key. (Hardcoding the key in the manifest works but defeats your gitignore strategy.)
>
> **Check 3 — Manifest builds cleanly:**
> ```bash
> cd android && ./gradlew :app:processDebugManifest
> ```
> **✓ Expected:** `BUILD SUCCESSFUL` with no manifest-merger errors.
>
> **❌ "AAPT: error: resource string/partnerKey not found":** You added the manifest meta-data before adding the string. Add `partnerKey` to `strings.xml` first.
>
> **❌ "Manifest merger failed":** Read the exact line — usually a permission was declared in two places (your app + a library). Add `tools:replace="android:..."` or remove the duplicate.
>
> **❌ Multiple `<application>` tags:** You pasted the snippet inside an existing `<application>` block. Merge the `meta-data` element into your existing `<application>`, don't add a new one.
>
> **🔧 If anything fails:** Don't proceed to writing Java files. A broken manifest will produce confusing "ClassNotFound" or "Context is null" errors at runtime that look unrelated.

### 3.4 Verify MainActivity extends FragmentActivity

Truecaller SDK requires the host to be a `FragmentActivity`. In RN, `MainActivity` extends `ReactActivity`, which **already extends FragmentActivity** through `ReactFragmentActivity`. So you're good by default — but if you've customized `MainActivity` to extend `Activity` directly, **change it back**.

Open `android/app/src/main/java/com/yourapp/MainActivity.java` (or `.kt`):

```java
public class MainActivity extends ReactActivity {
    // ... default RN code, no changes needed
}
```

### 3.5 Runtime permissions (handle in JS)

For Android 6+ you must request `READ_PHONE_STATE`, `READ_CALL_LOG`, and `ANSWER_PHONE_CALLS` at runtime **before** initiating the verification flow. We'll do this from the JS side in Part 5.

---

## Part 4: The Native Bridge (Java)

You need three files. Adjust the package name from `com.example` to your actual app's package (e.g. `com.yourapp`).

### 4.1 `TruecallerAuthModule.java`

Path: `android/app/src/main/java/com/yourapp/TruecallerAuthModule.java`

```java
package com.yourapp; // <-- change to YOUR package

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import com.truecaller.android.sdk.ITrueCallback;
import com.truecaller.android.sdk.TrueError;
import com.truecaller.android.sdk.TrueException;
import com.truecaller.android.sdk.TrueProfile;
import com.truecaller.android.sdk.TruecallerSDK;
import com.truecaller.android.sdk.TruecallerSdkScope;
import com.truecaller.android.sdk.clients.VerificationCallback;
import com.truecaller.android.sdk.clients.VerificationDataBundle;

public class TruecallerAuthModule extends ReactContextBaseJavaModule {

    private static final String TAG = "TruecallerAuthModule";
    private Promise promise = null;

    // Holds user-entered first/last name during non-TC verification
    private String userFirstName = "";
    private String userLastName = "";

    // ──────────────────────────────────────────────────────────────────
    // 1) Callback for One-Tap flow (Truecaller users)
    // ──────────────────────────────────────────────────────────────────
    private final ITrueCallback sdkCallback = new ITrueCallback() {

        @Override
        public void onSuccessProfileShared(@NonNull TrueProfile trueProfile) {
            if (promise == null) return;
            WritableMap map = Arguments.createMap();
            map.putString("flow", "ONE_TAP");
            map.putBoolean("successful", true);
            map.putString("firstName", trueProfile.firstName);
            map.putString("lastName", trueProfile.lastName);
            map.putString("phoneNumber", trueProfile.phoneNumber);
            map.putString("countryCode", trueProfile.countryCode);
            map.putString("email", trueProfile.email);
            map.putBoolean("isVerified", trueProfile.isTrueName);

            // ⚠️ SECURITY-CRITICAL: send these to your backend for validation
            map.putString("payload", trueProfile.payload);
            map.putString("signature", trueProfile.signature);
            map.putString("signatureAlgorithm", trueProfile.signatureAlgorithm);
            map.putString("requestNonce", trueProfile.requestNonce);

            promise.resolve(map);
            promise = null;
        }

        @Override
        public void onFailureProfileShared(@NonNull TrueError trueError) {
            Log.d(TAG, "onFailureProfileShared: " + trueError.getErrorType());
            if (promise == null) return;
            WritableMap map = Arguments.createMap();
            map.putString("flow", "ONE_TAP");
            map.putBoolean("successful", false);
            map.putString("error", mapErrorCode(trueError.getErrorType()));
            map.putInt("errorCode", trueError.getErrorType());
            promise.resolve(map);
            promise = null;
        }

        @Override
        public void onVerificationRequired(TrueError trueError) {
            // Tapped from JS side via startManualVerification(phoneNumber).
            // We don't auto-fire requestVerification here — JS will call it.
            Log.d(TAG, "onVerificationRequired — non-TC user, JS should call startManualVerification");
            if (promise == null) return;
            WritableMap map = Arguments.createMap();
            map.putString("flow", "VERIFICATION_REQUIRED");
            map.putBoolean("successful", false);
            map.putString("error", "ERROR_VERIFICATION_REQUIRED");
            promise.resolve(map);
            promise = null;
        }
    };

    // ──────────────────────────────────────────────────────────────────
    // 2) Callback for Non-TC verification (OTP / Missed call)
    // ──────────────────────────────────────────────────────────────────
    private final VerificationCallback apiCallback = new VerificationCallback() {

        @Override
        public void onRequestSuccess(int requestCode, @Nullable VerificationDataBundle extras) {
            WritableMap map = Arguments.createMap();
            String ttl = (extras != null) ? extras.getString(VerificationDataBundle.KEY_TTL) : null;

            switch (requestCode) {
                case VerificationCallback.TYPE_MISSED_CALL_INITIATED:
                    map.putString("event", "MISSED_CALL_INITIATED");
                    map.putString("ttl", ttl);
                    sendEvent("TruecallerVerificationEvent", map);
                    break;

                case VerificationCallback.TYPE_MISSED_CALL_RECEIVED:
                    map.putString("event", "MISSED_CALL_RECEIVED");
                    sendEvent("TruecallerVerificationEvent", map);
                    // Auto-complete with stored name
                    completeMissedCallVerification();
                    break;

                case VerificationCallback.TYPE_OTP_INITIATED:
                    map.putString("event", "OTP_INITIATED");
                    map.putString("ttl", ttl);
                    sendEvent("TruecallerVerificationEvent", map);
                    break;

                case VerificationCallback.TYPE_OTP_RECEIVED:
                    // Only fires if SMS Retriever hash is configured
                    String otp = (extras != null) ? extras.getString(VerificationDataBundle.KEY_OTP) : null;
                    map.putString("event", "OTP_RECEIVED");
                    map.putString("otp", otp);
                    sendEvent("TruecallerVerificationEvent", map);
                    break;

                case VerificationCallback.TYPE_VERIFICATION_COMPLETE:
                    map.putString("event", "VERIFICATION_COMPLETE");
                    if (extras != null) {
                        map.putString("accessToken", extras.getString(VerificationDataBundle.KEY_ACCESS_TOKEN));
                    }
                    sendEvent("TruecallerVerificationEvent", map);
                    if (promise != null) {
                        WritableMap result = Arguments.createMap();
                        result.putString("flow", "OTP_VERIFICATION");
                        result.putBoolean("successful", true);
                        if (extras != null) {
                            result.putString("accessToken", extras.getString(VerificationDataBundle.KEY_ACCESS_TOKEN));
                        }
                        promise.resolve(result);
                        promise = null;
                    }
                    break;

                case VerificationCallback.TYPE_PROFILE_VERIFIED_BEFORE:
                    map.putString("event", "PROFILE_VERIFIED_BEFORE");
                    if (extras != null) {
                        TrueProfile p = extras.getProfile();
                        if (p != null) {
                            map.putString("firstName", p.firstName);
                            map.putString("lastName", p.lastName);
                            map.putString("phoneNumber", p.phoneNumber);
                            map.putString("payload", p.payload);
                            map.putString("signature", p.signature);
                            map.putString("requestNonce", p.requestNonce);
                        }
                    }
                    sendEvent("TruecallerVerificationEvent", map);
                    break;
            }
        }

        @Override
        public void onRequestFailure(int requestCode, @NonNull TrueException e) {
            Log.e(TAG, "Verification failure: " + e.getExceptionMessage());
            WritableMap map = Arguments.createMap();
            map.putString("event", "VERIFICATION_FAILED");
            map.putInt("exceptionCode", e.getExceptionType());
            map.putString("exceptionMessage", e.getExceptionMessage());
            sendEvent("TruecallerVerificationEvent", map);
            if (promise != null) {
                promise.resolve(map);
                promise = null;
            }
        }
    };

    // ──────────────────────────────────────────────────────────────────
    // Constructor — initialize the SDK once
    // ──────────────────────────────────────────────────────────────────
    public TruecallerAuthModule(ReactApplicationContext reactContext) {
        super(reactContext);

        TruecallerSdkScope trueScope = new TruecallerSdkScope.Builder(reactContext, sdkCallback)
                .consentMode(TruecallerSdkScope.CONSENT_MODE_BOTTOMSHEET)
                .buttonColor(Color.parseColor("#1E88E5"))         // change to your brand color
                .buttonTextColor(Color.parseColor("#FFFFFF"))
                .loginTextPrefix(TruecallerSdkScope.LOGIN_TEXT_PREFIX_TO_GET_STARTED)
                .loginTextSuffix(TruecallerSdkScope.LOGIN_TEXT_SUFFIX_PLEASE_VERIFY_MOBILE_NO)
                .ctaTextPrefix(TruecallerSdkScope.CTA_TEXT_PREFIX_USE)
                .buttonShapeOptions(TruecallerSdkScope.BUTTON_SHAPE_ROUNDED)
                .privacyPolicyUrl("https://yourapp.com/privacy")   // REQUIRED
                .termsOfServiceUrl("https://yourapp.com/terms")    // REQUIRED
                .footerType(TruecallerSdkScope.FOOTER_TYPE_SKIP)
                .consentTitleOption(TruecallerSdkScope.SDK_CONSENT_TITLE_LOG_IN)
                .sdkOptions(TruecallerSdkScope.SDK_OPTION_WITH_OTP)  // ⬅ CRITICAL: WITH_OTP for non-TC fallback
                .build();

        TruecallerSDK.init(trueScope);
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "TruecallerAuthModule";
    }

    // ──────────────────────────────────────────────────────────────────
    // JS-facing methods
    // ──────────────────────────────────────────────────────────────────

    @ReactMethod
    public void isUsable(Promise promise) {
        try {
            boolean usable = TruecallerSDK.getInstance() != null
                          && TruecallerSDK.getInstance().isUsable();
            promise.resolve(usable);
        } catch (Exception e) {
            promise.reject("E_ISUSABLE", e);
        }
    }

    @ReactMethod
    public void authenticate(Promise promise) {
        try {
            this.promise = promise;
            Activity activity = getCurrentActivity();
            if (activity == null) {
                rejectAndClear("ERROR_NO_ACTIVITY");
                return;
            }
            if (TruecallerSDK.getInstance() == null) {
                rejectAndClear("ERROR_SDK_NOT_INITIALIZED");
                return;
            }
            // With SDK_OPTION_WITH_OTP, isUsable() always returns true
            TruecallerSDK.getInstance().getUserProfile((FragmentActivity) activity);
        } catch (Exception e) {
            if (this.promise != null) this.promise.reject(e);
            this.promise = null;
        }
    }

    @ReactMethod
    public void startManualVerification(String phoneNumber, String firstName, String lastName, Promise promise) {
        try {
            this.promise = promise;
            this.userFirstName = firstName != null ? firstName : "";
            this.userLastName  = lastName  != null ? lastName  : "";

            Activity activity = getCurrentActivity();
            if (activity == null) {
                rejectAndClear("ERROR_NO_ACTIVITY");
                return;
            }
            // "IN" = India country code, per your target market
            TruecallerSDK.getInstance().requestVerification(
                    "IN",
                    phoneNumber,
                    apiCallback,
                    (FragmentActivity) activity
            );
        } catch (Exception e) {
            if (this.promise != null) this.promise.reject(e);
            this.promise = null;
        }
    }

    @ReactMethod
    public void verifyOtp(String otp, String firstName, String lastName, Promise promise) {
        try {
            this.promise = promise;
            TrueProfile profile = new TrueProfile.Builder(firstName, lastName).build();
            TruecallerSDK.getInstance().verifyOtp(profile, otp, apiCallback);
        } catch (Exception e) {
            promise.reject("E_VERIFY_OTP", e);
        }
    }

    @ReactMethod
    public void clear() {
        TruecallerSDK.clear();
    }

    // ──────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────

    private void completeMissedCallVerification() {
        TrueProfile profile = new TrueProfile.Builder(userFirstName, userLastName).build();
        TruecallerSDK.getInstance().verifyMissedCall(profile, apiCallback);
    }

    private void sendEvent(String eventName, WritableMap params) {
        getReactApplicationContext()
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    private void rejectAndClear(String errorCode) {
        if (promise != null) {
            WritableMap map = Arguments.createMap();
            map.putBoolean("successful", false);
            map.putString("error", errorCode);
            promise.resolve(map);
            promise = null;
        }
    }

    private String mapErrorCode(int code) {
        switch (code) {
            case TrueError.ERROR_TYPE_INTERNAL:                       return "ERROR_TYPE_INTERNAL";
            case TrueError.ERROR_TYPE_NETWORK:                        return "ERROR_TYPE_NETWORK";
            case TrueError.ERROR_TYPE_USER_DENIED:                    return "ERROR_TYPE_USER_DENIED";
            case TrueError.ERROR_PROFILE_NOT_FOUND:                   return "ERROR_PROFILE_NOT_FOUND";
            case TrueError.ERROR_TYPE_UNAUTHORIZED_USER:              return "ERROR_TYPE_UNAUTHORIZED_USER";
            case TrueError.ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY: return "ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY";
            case TrueError.ERROR_TYPE_TRUESDK_TOO_OLD:                return "ERROR_TYPE_TRUESDK_TOO_OLD";
            case TrueError.ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION:    return "ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION";
            case TrueError.ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH:    return "ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH";
            case TrueError.ERROR_TYPE_REQUEST_NONCE_MISMATCH:         return "ERROR_TYPE_REQUEST_NONCE_MISMATCH";
            case TrueError.ERROR_TYPE_INVALID_ACCOUNT_STATE:          return "ERROR_TYPE_INVALID_ACCOUNT_STATE";
            case TrueError.ERROR_TYPE_TC_NOT_INSTALLED:               return "ERROR_TYPE_TC_NOT_INSTALLED";
            case TrueError.ERROR_TYPE_ACTIVITY_NOT_FOUND:             return "ERROR_TYPE_ACTIVITY_NOT_FOUND";
            default:                                                  return "ERROR_UNKNOWN_" + code;
        }
    }

    // Required so SDK can hand control back after its activity returns
    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
            super.onActivityResult(activity, requestCode, resultCode, intent);
            if (requestCode == TruecallerSDK.SHARE_PROFILE_REQUEST_CODE) {
                TruecallerSDK.getInstance().onActivityResultObtained(
                        (FragmentActivity) activity, requestCode, resultCode, intent);
            }
        }
    };
}
```

### 4.2 `TruecallerAuthPackage.java`

Path: `android/app/src/main/java/com/yourapp/TruecallerAuthPackage.java`

```java
package com.yourapp; // <-- change to YOUR package

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TruecallerAuthPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new TruecallerAuthModule(reactContext));
        return modules;
    }
}
```

### 4.3 Register the package in `MainApplication.java`

Open `android/app/src/main/java/com/yourapp/MainApplication.java` and add the package to `getPackages()`:

```java
@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    // ADD THIS LINE:
    packages.add(new TruecallerAuthPackage());
    return packages;
}
```

For new architecture / RN 0.73+, the package gets auto-linked if you put it in `MainApplication.kt`'s `getPackages()` override the same way.

> ### ✅ Verification Gate 4 — Native bridge compiles and registers
>
> This is the highest-risk brick. Three independent checks must all pass.
>
> **Check 1 — Files exist with correct package:**
> ```bash
> grep -l "package com" android/app/src/main/java/com/yourapp/Truecaller*.java
> ```
> **✓ Expected:** Both `TruecallerAuthModule.java` and `TruecallerAuthPackage.java` listed, and the `package` line in each file matches your folder path EXACTLY. If files are in `java/com/yourapp/` the package line must be `package com.yourapp;` — no typos, no extra dots.
>
> **Check 2 — Java compiles:**
> ```bash
> cd android && ./gradlew :app:compileDebugJavaWithJavac
> ```
> **✓ Expected:** `BUILD SUCCESSFUL`. No red errors.
>
> Common compile failures and fixes:
>
> | Error | Fix |
> |---|---|
> | `cannot find symbol: TruecallerSDK` | Gradle dep didn't sync. Re-run Gate 3.1. |
> | `cannot find symbol: ReactContextBaseJavaModule` | RN core not on classpath; check `node_modules/react-native` installed. |
> | `class TruecallerAuthModule is public, should be declared in a file named...` | File name doesn't match class name exactly. Rename file. |
> | `cannot access androidx.fragment.app.FragmentActivity` | Add `implementation "androidx.fragment:fragment:1.6.2"` if missing. |
>
> **Check 3 — Package is registered:**
> ```bash
> grep "TruecallerAuthPackage" android/app/src/main/java/com/yourapp/MainApplication.java
> ```
> **✓ Expected:** Two matches — one `import` line (if you imported it) and one `packages.add(new TruecallerAuthPackage());` line inside `getPackages()`.
>
> If `MainApplication` is in a different package than your bridge files, you need an explicit import:
> ```java
> import com.yourapp.TruecallerAuthPackage;  // only if different package
> ```
>
> **Check 4 — Module is reachable from JS (smoke test):**
>
> Add this temporarily to your App.js / index.js:
> ```javascript
> import { NativeModules } from 'react-native';
> console.log('Truecaller bridge:', NativeModules.TruecallerAuthModule);
> ```
>
> Build and run the app, then in Metro logs:
>
> **✓ Expected:** `Truecaller bridge: { isUsable: [Function], authenticate: [Function], startManualVerification: [Function], verifyOtp: [Function], clear: [Function] }`
>
> **❌ Logs show `undefined`:** Package not registered. Re-check `MainApplication.java`'s `getPackages()`. Also kill the app fully (swipe away from recents) and `npx react-native run-android` again — JS bundle caches old NativeModule lists.
>
> **❌ Logs show `{}` (empty object):** `@ReactMethod` annotation missing on one or more methods, OR module class doesn't extend `ReactContextBaseJavaModule`.
>
> **❌ App crashes on launch with `ClassNotFoundException`:** Proguard stripped the module in release builds. Add the keep rules from Part 11, issue #5.
>
> **🔧 Do not proceed past this gate.** Every later step assumes the bridge is reachable.

---

## Part 5: React Native (JS) Side

### 5.1 Permission helper (`permissions.js`)

```javascript
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestTruecallerPermissions() {
  if (Platform.OS !== 'android') return false;

  const apiLevel = Platform.Version;
  const perms = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ];

  if (apiLevel >= 26) {
    perms.push(PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS);
  } else {
    perms.push(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
  }

  const result = await PermissionsAndroid.requestMultiple(perms);
  return Object.values(result).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
}
```

### 5.2 JS wrapper module (`TruecallerAuth.js`)

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { TruecallerAuthModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(TruecallerAuthModule);

export const TruecallerEvents = {
  onEvent: (cb) => eventEmitter.addListener('TruecallerVerificationEvent', cb),
};

export const TruecallerAuth = {
  isUsable: () => TruecallerAuthModule.isUsable(),
  authenticate: () => TruecallerAuthModule.authenticate(),
  startManualVerification: (phoneNumber, firstName, lastName) =>
    TruecallerAuthModule.startManualVerification(phoneNumber, firstName, lastName),
  verifyOtp: (otp, firstName, lastName) =>
    TruecallerAuthModule.verifyOtp(otp, firstName, lastName),
  clear: () => TruecallerAuthModule.clear(),
};
```

> ### ✅ Verification Gate 5.2 — JS wrapper round-trips to native
>
> **Check:** Add this one-time smoke test to your App.js:
> ```javascript
> import { TruecallerAuth, TruecallerEvents } from './TruecallerAuth';
>
> useEffect(() => {
>   (async () => {
>     try {
>       const usable = await TruecallerAuth.isUsable();
>       console.log('[TC Smoke] isUsable returned:', usable);
>     } catch (e) {
>       console.log('[TC Smoke] isUsable threw:', e.message);
>     }
>   })();
> }, []);
> ```
>
> **✓ Expected:** Metro log shows `[TC Smoke] isUsable returned: true` (with `SDK_OPTION_WITH_OTP`, this always returns `true`).
>
> **❌ `[TC Smoke] isUsable threw: undefined is not an object`:** `NativeModules.TruecallerAuthModule` is undefined — go back to Gate 4 Check 4.
>
> **❌ Hangs forever, no log:** Promise was created but never resolved/rejected on the Java side. Open Android Studio's Logcat, filter for `TruecallerAuthModule`, look for stack traces. Usually means `getCurrentActivity()` returned null because the smoke test ran before activity was attached. Wrap in a `setTimeout(..., 1000)` to confirm.
>
> **❌ Returns `false` unexpectedly:** Your SDK init failed silently. In Logcat filter for `TruecallerSDK`, look for `init()` failure messages — usually points to invalid `PartnerKey` or missing manifest meta-data.
>
> **🔧 Remove the smoke test from App.js after this gate passes.** It's just for verification.

### 5.3 Full auth flow in a screen

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { TruecallerAuth, TruecallerEvents } from './TruecallerAuth';
import { requestTruecallerPermissions } from './permissions';

export default function LoginScreen({ onLoggedIn }) {
  const [phase, setPhase] = useState('idle'); // idle | manual | awaiting_otp | verifying
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [ttl, setTtl] = useState(null);

  useEffect(() => {
    const sub = TruecallerEvents.onEvent((e) => {
      console.log('TC event:', e);
      switch (e.event) {
        case 'OTP_INITIATED':
          setPhase('awaiting_otp');
          setTtl(e.ttl);
          break;
        case 'OTP_RECEIVED':
          // Auto-filled if SMS Retriever is configured
          if (e.otp) setOtp(e.otp);
          break;
        case 'MISSED_CALL_INITIATED':
          setPhase('awaiting_missed_call');
          setTtl(e.ttl);
          break;
        case 'MISSED_CALL_RECEIVED':
          // SDK auto-completes; we'll get VERIFICATION_COMPLETE next
          setPhase('verifying');
          break;
        case 'VERIFICATION_COMPLETE':
          sendToBackend({ accessToken: e.accessToken, phone, firstName, lastName });
          break;
        case 'PROFILE_VERIFIED_BEFORE':
          sendToBackend({
            payload: e.payload, signature: e.signature, requestNonce: e.requestNonce,
            firstName: e.firstName, lastName: e.lastName, phone: e.phoneNumber,
          });
          break;
        case 'VERIFICATION_FAILED':
          Alert.alert('Verification failed', e.exceptionMessage);
          setPhase('idle');
          break;
      }
    });
    return () => sub.remove();
  }, [phone, firstName, lastName]);

  const handleStartAuth = async () => {
    const ok = await requestTruecallerPermissions();
    if (!ok) {
      Alert.alert('Permissions needed', 'Please grant phone permissions to continue.');
      return;
    }

    const result = await TruecallerAuth.authenticate();
    console.log('authenticate result:', result);

    if (result.flow === 'ONE_TAP' && result.successful) {
      // Truecaller user → send signed payload to backend
      sendToBackend({
        payload: result.payload,
        signature: result.signature,
        requestNonce: result.requestNonce,
        firstName: result.firstName,
        lastName: result.lastName,
        phone: result.phoneNumber,
      });
    } else if (result.error === 'ERROR_VERIFICATION_REQUIRED'
            || result.error === 'ERROR_TYPE_TC_NOT_INSTALLED') {
      // Non-TC user → show phone input form
      setPhase('manual');
    } else if (result.error === 'ERROR_TYPE_USER_DENIED') {
      // Fall back to manual entry too
      setPhase('manual');
    } else {
      Alert.alert('Login failed', result.error || 'Unknown error');
    }
  };

  const handleSubmitPhone = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!firstName.trim()) {
      Alert.alert('Name required', 'Please enter your first name.');
      return;
    }
    TruecallerAuth.startManualVerification(phone, firstName, lastName);
  };

  const handleSubmitOtp = () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP');
      return;
    }
    TruecallerAuth.verifyOtp(otp, firstName, lastName);
  };

  const sendToBackend = async (data) => {
    // ⚠️ This is where you MUST validate signature server-side
    const res = await fetch('https://yourapi.com/auth/truecaller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) onLoggedIn(json.user, json.jwt);
    else Alert.alert('Auth failed', json.message);
  };

  return (
    <View style={{ padding: 20 }}>
      {phase === 'idle' && (
        <Button title="Continue with Truecaller" onPress={handleStartAuth} />
      )}
      {phase === 'manual' && (
        <>
          <TextInput placeholder="First name" value={firstName} onChangeText={setFirstName} />
          <TextInput placeholder="Last name" value={lastName} onChangeText={setLastName} />
          <TextInput placeholder="Phone (10 digits)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
          <Button title="Send OTP" onPress={handleSubmitPhone} />
        </>
      )}
      {phase === 'awaiting_otp' && (
        <>
          <Text>Enter the OTP sent to +91{phone} (expires in {ttl}s)</Text>
          <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
          <Button title="Verify" onPress={handleSubmitOtp} />
        </>
      )}
      {phase === 'awaiting_missed_call' && (
        <Text>You'll receive a missed call shortly. Don't pick it up — we'll auto-verify.</Text>
      )}
      {phase === 'verifying' && <Text>Verifying...</Text>}
    </View>
  );
}
```

> ### ✅ Verification Gate 5.3 — End-to-end auth flow works on a real device
>
> This gate has **two scenarios** you must verify before moving on. Use registered test numbers from Gate 2.4.
>
> **Scenario A — Truecaller user (one-tap):**
>
> 1. Install Truecaller app on a test device, log in with a registered test number.
> 2. Install your debug build, open it.
> 3. Tap "Continue with Truecaller."
>
> **✓ Expected:**
> - Bottom sheet appears in ~1s showing the TC profile.
> - Tapping "Continue" returns `flow: 'ONE_TAP'`, `successful: true`, with `payload`, `signature`, and `requestNonce` populated.
> - Your `sendToBackend` is called with these fields.
>
> **❌ Bottom sheet flashes and disappears:** TC app not logged in or logged in with a non-registered number. Check Truecaller console → your app → registered test numbers.
>
> **❌ `ERROR_PROFILE_NOT_FOUND`:** SHA-1 mismatch. The SHA-1 of the APK signing key doesn't match what's on the console. Re-run Gate 2.2 and ensure the active variant is `debug` (or release).
>
> **❌ `ERROR_TYPE_TRUESDK_TOO_OLD`:** Truecaller app on the device is old. Update it from Play Store.
>
> ---
>
> **Scenario B — Non-Truecaller user (OTP fallback):**
>
> 1. Use a test device WITHOUT Truecaller app installed (uninstall if needed).
> 2. Open your app, tap "Continue with Truecaller."
>
> **✓ Expected:**
> - `authenticate()` resolves with `error: 'ERROR_TYPE_TC_NOT_INSTALLED'` or `ERROR_VERIFICATION_REQUIRED`.
> - Your UI switches to manual entry (`phase === 'manual'`).
> - Enter a registered test phone number + name, tap "Send OTP."
> - Within 5–10s you receive an event: `event: 'OTP_INITIATED'` OR `event: 'MISSED_CALL_INITIATED'` (with a `ttl` like `"60"`).
> - For OTP: SMS arrives on the device. Enter it, tap Verify.
> - You receive `event: 'VERIFICATION_COMPLETE'` with an `accessToken`.
>
> **❌ No event ever fires after `startManualVerification`:** `NativeEventEmitter` not wired correctly. Check that `TruecallerEvents.onEvent(...)` is called BEFORE `startManualVerification`, and that the listener's `.remove()` runs only on unmount, not on every render.
>
> **❌ `OTP_INITIATED` fires but no SMS arrives:** Number not registered as test number, OR Truecaller's backend is throttling you (test it ~5 min later). Production rate limits are stricter — see Part 10.
>
> **❌ `MISSED_CALL_INITIATED` fires but no call arrives:** Network operator may block Truecaller's missed-call numbers. Backend will auto-retry with OTP — wait 30s.
>
> **❌ `VERIFICATION_FAILED` with exception code 9:** Number is registered to a different Truecaller account elsewhere. Use a fresh test number.
>
> **🔧 Capture a Logcat trace for any failure:**
> ```bash
> adb logcat -s "TruecallerAuthModule:V" "TruecallerSDK:V" "ReactNativeJS:V"
> ```
> The triple filter shows your bridge logs, Truecaller SDK logs, and JS console logs in one stream — critical for debugging timing issues.
>
> **Do not skip this gate.** If Scenario A AND Scenario B both pass on a real device, your client-side is correct. From here on, all remaining failures will be server-side or environmental.

---

## Part 6: Understanding the OTP Fallback Flow Deeply

When `requestVerification(...)` is called, Truecaller's backend decides which method to use based on the user's device, network, and history. **You don't control which method is picked** — your UI must handle all of them.

**Sequence of callbacks:**

| Step | Callback | Meaning | Your action |
|------|----------|---------|-------------|
| 1 | `TYPE_MISSED_CALL_INITIATED` or `TYPE_OTP_INITIATED` | Verification started | Show "waiting" UI with TTL countdown |
| 2a | `TYPE_MISSED_CALL_RECEIVED` | Phone got the missed call | SDK auto-verifies, you just wait |
| 2b | `TYPE_OTP_RECEIVED` (only if SMS Retriever set up) | OTP auto-detected from SMS | Pre-fill OTP field |
| 3 | `TYPE_VERIFICATION_COMPLETE` | Success — accessToken available | Send to backend |
| 3-alt | `TYPE_PROFILE_VERIFIED_BEFORE` | This number was verified before by this app | Use returned profile + signed payload |

**TTL behavior:** Each verification attempt has a TTL (typically 60–120s). You **cannot** restart verification for the same number until TTL expires. Disable the "Resend" button until TTL ends.

**Edge cases to handle:**
- User has dual SIM → Truecaller may pick the wrong one. Always show the entered number back to the user.
- User is on iOS-only network (no SMS short codes) → falls back to OTP.
- User has no Truecaller history → must always go through OTP/missed call.
- App backgrounded during verification → callbacks still fire when app returns; don't disable the event listener.

---

## Part 7: Server-Side Validation (DO NOT SKIP)

The client-side success response can be **spoofed**. A malicious user can return fake `successful: true` to your JS code. The only thing that proves the user is real is the **signed payload from Truecaller's servers**.

### 7.1 What you receive

For one-tap (Truecaller users):
- `payload` — base64-encoded JSON containing profile + nonce + timestamp
- `signature` — RSA signature of the payload
- `signatureAlgorithm` — e.g. `SHA512withRSA`
- `requestNonce` — must match what SDK generated

For OTP flow, `TYPE_VERIFICATION_COMPLETE` gives you an `accessToken` you exchange server-to-server with Truecaller.

### 7.2 Validation on your backend (Node.js example)

```javascript
// POST /auth/truecaller
const crypto = require('crypto');
const fetch = require('node-fetch');

// 1) Fetch Truecaller's public keys (cache for 24h)
async function getTcPublicKeys() {
  const res = await fetch('https://api4.truecaller.com/v1/key');
  return res.json(); // returns array of { keyName, key }
}

// 2) Verify signature
async function verifyTcPayload({ payload, signature, signatureAlgorithm }) {
  const keys = await getTcPublicKeys();
  const algo = signatureAlgorithm.includes('512') ? 'RSA-SHA512' : 'RSA-SHA256';
  for (const { key } of keys) {
    const verifier = crypto.createVerify(algo);
    verifier.update(payload);
    const pem = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    if (verifier.verify(pem, signature, 'base64')) {
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      // Validate freshness: requestTime should be within last 10 mins
      if (Date.now() - decoded.requestTime > 10 * 60 * 1000) return null;
      return decoded;
    }
  }
  return null;
}

app.post('/auth/truecaller', async (req, res) => {
  const { payload, signature, signatureAlgorithm, requestNonce, accessToken } = req.body;

  let profile;
  if (payload && signature) {
    // One-tap flow
    profile = await verifyTcPayload({ payload, signature, signatureAlgorithm });
    if (!profile) return res.json({ success: false, message: 'Invalid signature' });
    if (profile.requestNonce !== requestNonce) return res.json({ success: false, message: 'Nonce mismatch' });
  } else if (accessToken) {
    // OTP flow — fetch profile from Truecaller using access token
    const tcRes = await fetch('https://api5.truecaller.com/v1/otp/installation/verify/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    profile = await tcRes.json();
    if (!profile.phoneNumber) return res.json({ success: false });
  }

  // Now create/find user in your DB by profile.phoneNumber
  const user = await findOrCreateUser(profile);
  const jwt = signJwt(user);
  res.json({ success: true, user, jwt });
});
```

**Public key endpoint** for the truecaller-sdk is documented here: `https://api4.truecaller.com/v1/key`. Cache the keys with a 24h TTL — don't hit it on every login.

> ### ✅ Verification Gate 7 — Server-side validation actually rejects forged payloads
>
> This is the most important gate in the entire guide. If this fails, you have a security hole — anyone can impersonate any user.
>
> **Test 1 — Valid payload accepted:**
>
> Take a real `payload` + `signature` + `requestNonce` from a successful login (log them temporarily). POST to your endpoint:
> ```bash
> curl -X POST https://yourapi.com/auth/truecaller \
>   -H "Content-Type: application/json" \
>   -d '{"payload":"<real-payload>","signature":"<real-sig>","signatureAlgorithm":"SHA512withRSA","requestNonce":"<real-nonce>"}'
> ```
> **✓ Expected:** `{"success": true, "user": {...}, "jwt": "..."}`.
>
> **Test 2 — Tampered payload rejected:**
>
> Take the same payload but flip one character in the middle (change `aGVsbG8` → `aXVsbG8`, for example):
> ```bash
> curl -X POST https://yourapi.com/auth/truecaller \
>   -H "Content-Type: application/json" \
>   -d '{"payload":"<TAMPERED-payload>","signature":"<real-sig>","signatureAlgorithm":"SHA512withRSA","requestNonce":"<real-nonce>"}'
> ```
> **✓ Expected:** `{"success": false, "message": "Invalid signature"}`.
>
> **❌ If Test 2 returns success:** Your `verifyTcPayload` is broken. Common causes:
> - Wrong algorithm (`SHA256withRSA` vs `SHA512withRSA` — read `signatureAlgorithm` field, don't hardcode)
> - Public key not properly PEM-wrapped (must have `\n` between header/body/footer, not space)
> - Signature base64-decoded twice (decode once, pass as Buffer)
>
> **Test 3 — Replayed nonce rejected:**
>
> POST the SAME valid payload from Test 1 again:
> ```bash
> curl -X POST https://yourapi.com/auth/truecaller \
>   -H "Content-Type: application/json" \
>   -d '<same-body-as-test-1>'
> ```
> **✓ Expected:** First call succeeds, second call returns `{"success": false, "message": "Nonce already used"}`.
>
> **❌ If second call succeeds:** You're not tracking used nonces. Add a Redis SET with 1-hour TTL keyed by `requestNonce`. Reject if already present.
>
> **Test 4 — Expired payload rejected:**
>
> Take a payload from a successful login >10 minutes ago. POST it.
> **✓ Expected:** `{"success": false, "message": "Payload expired"}`.
>
> **❌ If old payload succeeds:** Your `requestTime` freshness check isn't working. Decode the payload base64 → parse JSON → check `Date.now() - decoded.requestTime < 10 * 60 * 1000`.
>
> **Test 5 — Wrong nonce rejected:**
>
> Take a valid payload but send a different `requestNonce` in the request body:
> **✓ Expected:** `{"success": false, "message": "Nonce mismatch"}`.
>
> **❌ If passes:** Your code isn't comparing the body's `requestNonce` against the decoded payload's `requestNonce`. Both must match.
>
> ---
>
> **🔧 If any test fails, do not deploy.** A working "happy path" without these rejections means your auth is open to spoofing. Run all five tests in a unit test suite and add them to CI so refactors can't break the validation.

---

## Part 8: All Error Codes Decoded

| Code | When it happens | What to do |
|------|----------------|------------|
| `ERROR_TYPE_INTERNAL` | SDK internal error | Retry; if persistent, file with Truecaller |
| `ERROR_TYPE_NETWORK` | No internet | Show network error UI |
| `ERROR_TYPE_USER_DENIED` | User tapped "Skip" / "Use another number" | Show manual phone input |
| `ERROR_PROFILE_NOT_FOUND` | Wrong PartnerKey or unverified app | Recheck SHA-1 + package name on console |
| `ERROR_TYPE_UNAUTHORIZED_USER` | Truecaller account in bad state | User issue — ask them to relogin to TC app |
| `ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY` | TC app crashed mid-flow | Retry once, then fall back to manual |
| `ERROR_TYPE_TRUESDK_TOO_OLD` | User has very old TC app version | Prompt them to update TC, or fall back |
| `ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION` | RC clash with another lib | Change another lib's request code |
| `ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH` | Tampered response | Reject; possible attack — log it |
| `ERROR_TYPE_REQUEST_NONCE_MISMATCH` | Nonce stolen/reused | Reject; possible replay attack |
| `ERROR_TYPE_INVALID_ACCOUNT_STATE` | User's TC account is suspended | Fall back to manual |
| `ERROR_TYPE_TC_NOT_INSTALLED` | TC app not on device | Trigger manual verification |
| `ERROR_TYPE_ACTIVITY_NOT_FOUND` | Activity context invalid | Bug in your bridge — ensure FragmentActivity |

---

## Part 9: SMS Retriever (Auto-OTP)

To auto-detect the OTP without `RECEIVE_SMS` permission:

1. **Generate your app hash** using Google's tool or this command:
   ```bash
   keytool -exportcert -alias YOUR_KEY_ALIAS -keystore YOUR_KEYSTORE | \
   xxd -p | tr -d "[:space:]" | echo -n "$(cat) com.yourapp" | \
   shasum -a 256 | xxd -r -p | base64 | cut -c1-11
   ```
2. **Add the 11-char hash** to your app in the Truecaller developer console under "SMS Retriever Hash."
3. Truecaller will format their OTP SMS to include this hash, which triggers Google's SMS Retriever API to deliver the OTP to your app silently.
4. The `TYPE_OTP_RECEIVED` callback then carries `otp` in the extras — you pre-fill the input.

**Note:** You need separate hashes for debug and release builds (different signing keys).

---

## Part 10: Production Checklist

Before going live:

- [ ] **All 9 verification gates have passed and been logged** (see Verification Gate Summary at the end)
- [ ] Released SHA-1 (including Play App Signing SHA-1 if applicable) is registered on Truecaller console
- [ ] Privacy policy and ToS URLs in `TruecallerSdkScope` point to live pages
- [ ] Partner Key is not committed to public repo (use BuildConfig / secrets manager)
- [ ] Server-side signature verification is implemented and **Gate 7 Tests 1–5 all pass in CI**
- [ ] All error codes have user-facing messages (use the table in Part 8)
- [ ] Fallback to manual entry works when TC is not installed (Gate 5.3B passed)
- [ ] TTL countdown displayed to user during OTP wait
- [ ] Resend OTP disabled until TTL expires
- [ ] `TruecallerAuth.clear()` is called when user logs out
- [ ] Tested on Android 7, 10, 13, and 14 (permission model differs)
- [ ] Tested with TC user, non-TC user, AND TC user not logged into TC
- [ ] Production app submitted for Truecaller approval (required for high-volume use)
- [ ] Rate limits understood — Truecaller throttles per app per number
- [ ] Logcat scrubbed of any line that prints `payload`, `signature`, `accessToken`, or full `phoneNumber` in production builds

---

## Part 11: Common "Why Isn't This Working?" Issues

**1. `ERROR_PROFILE_NOT_FOUND` on every attempt**
→ SHA-1 mismatch. Run `./gradlew signingReport` from `android/` and compare every SHA-1 with what's on the console.

**2. Bottom sheet opens then immediately closes**
→ Either Truecaller app isn't installed OR not logged in. With `SDK_OPTION_WITH_OTP`, you should still get `onVerificationRequired` — make sure that callback isn't silently failing.

**3. JS never receives the verification events**
→ You forgot the `NativeEventEmitter` setup, or you're using `DeviceEventEmitter` in JS. Use `NativeEventEmitter(TruecallerAuthModule)` exactly.

**4. Build fails with "Duplicate class okhttp3.*"**
→ Truecaller pulls okhttp 3.x; if you have okhttp 4.x elsewhere, exclude one. Usually:
```gradle
implementation("com.truecaller.android.sdk:truecaller-sdk:2.6.0") {
    exclude group: 'com.squareup.okhttp3'
}
```
and add the version you want explicitly.

**5. `verifyOtp` works in debug, fails in release**
→ Release SHA-1 not registered, OR `proguard-rules.pro` is stripping SDK classes. Add:
```
-keep class com.truecaller.android.sdk.** { *; }
-keep interface com.truecaller.android.sdk.** { *; }
```

**6. `isUsable()` returns false even though TC is installed**
→ User isn't logged into Truecaller, or TC version is too old. With `SDK_OPTION_WITH_OTP` you don't actually need to call `isUsable()` — just call `authenticate()` directly.

**7. App crashes with `ClassCastException: MainActivity cannot be cast to FragmentActivity`**
→ You changed `MainActivity` to extend `Activity`. Revert to `ReactActivity`.

**8. OTP arrives but `TYPE_OTP_RECEIVED` never fires**
→ SMS Retriever hash not configured on Truecaller dashboard. Without it, OTP arrives in user's SMS app and you must collect it manually via TextInput (which is what most apps do anyway).

---

## 🛡️ Verification Gate Summary — Print This

Each gate must pass before moving to the next. If you're debugging later, walk back through this list to find which gate started silently failing.

| # | Gate | What it proves | Failure means |
|---|------|----------------|---------------|
| 2.2 | SHA-1 captured | You have the right signing fingerprint | Console registration will be wrong |
| 2.3 | App registered, Partner Key obtained | Truecaller knows your app | All API calls will fail with `ERROR_PROFILE_NOT_FOUND` |
| 3.1 | Gradle resolves Truecaller SDK | Dependency is on classpath | Java imports won't compile |
| 3.3 | Manifest & strings.xml correct | SDK can read its Partner Key at init | SDK init silently fails |
| 4 | Native bridge compiles + registers | Java ↔ JS bridge works | `NativeModules.TruecallerAuthModule` is undefined |
| 5.2 | JS wrapper round-trips to native | Promises resolve | All flows hang forever |
| 5.3A | Real device, TC user, one-tap | OAuth happy path works | Forget production approval |
| 5.3B | Real device, non-TC user, OTP | Fallback flow works | Half your users can't log in |
| 7 | Server validation rejects forged/replayed/expired payloads | Auth is actually secure | You have a critical security hole |

**Gates 4, 5.3, and 7 are non-negotiable.** If any of these three is skipped or "kind of working," you have not finished integration. Mark them in your tracker as separate tickets.

---

## Quick Reference: Files You Touched

```
android/app/build.gradle                     # Added truecaller-sdk:2.6.0
android/app/src/main/res/values/strings.xml  # Added partnerKey
android/app/src/main/AndroidManifest.xml     # PartnerKey meta-data + permissions
android/app/src/main/java/com/yourapp/
  ├── MainApplication.java                   # Registered TruecallerAuthPackage
  ├── TruecallerAuthModule.java              # Native bridge (NEW)
  └── TruecallerAuthPackage.java             # Package registration (NEW)
android/app/proguard-rules.pro               # Added keep rules for release builds

src/
  ├── TruecallerAuth.js                      # JS wrapper (NEW)
  ├── permissions.js                         # Runtime permissions helper (NEW)
  └── screens/LoginScreen.js                 # Login flow (NEW)

backend/
  └── routes/auth.js                         # Signature verification endpoint (NEW)
```

---

**You're ready to rock. 🚀**

If any specific brick fails to land properly, copy the exact error message + the file/line where it's thrown and we'll debug it together.