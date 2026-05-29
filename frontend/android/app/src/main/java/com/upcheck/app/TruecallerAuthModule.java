package com.upcheck.app;

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

/**
 * React Native bridge for Truecaller SDK 2.6.0 (legacy v2.x with Partner Key).
 *
 * Exposes:
 *   - isUsable()                                    -> Promise<boolean>
 *   - authenticate()                                -> Promise<{flow, successful, ...}>  (One-Tap)
 *   - startManualVerification(phone, fName, lName)  -> Promise<{flow, successful, ...}>  (OTP/missed call)
 *   - verifyOtp(otp, fName, lName)                  -> Promise<{flow, successful, ...}>
 *   - clear()                                       -> void
 *
 * Emits "TruecallerVerificationEvent" via DeviceEventEmitter for OTP/missed-call progress:
 *   OTP_INITIATED, OTP_RECEIVED, MISSED_CALL_INITIATED, MISSED_CALL_RECEIVED,
 *   VERIFICATION_COMPLETE, PROFILE_VERIFIED_BEFORE, VERIFICATION_FAILED.
 *
 * SECURITY: payload, signature, requestNonce, accessToken, and full phoneNumber are
 * passed through to JS for backend verification, but MUST NOT appear in any log
 * statement (Requirement 13.1).
 */
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

            // SECURITY-CRITICAL: send these to your backend for validation
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
            // JS side will call startManualVerification(phoneNumber, firstName, lastName)
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
                    completeMissedCallVerification();
                    break;

                case VerificationCallback.TYPE_OTP_INITIATED:
                    map.putString("event", "OTP_INITIATED");
                    map.putString("ttl", ttl);
                    sendEvent("TruecallerVerificationEvent", map);
                    break;

                case VerificationCallback.TYPE_OTP_RECEIVED:
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
                // Upcheck brand primary (frontend/src/theme/colors.ts → Colors.primary)
                .buttonColor(Color.parseColor("#00897B"))
                .buttonTextColor(Color.parseColor("#FFFFFF"))
                .loginTextPrefix(TruecallerSdkScope.LOGIN_TEXT_PREFIX_TO_GET_STARTED)
                .loginTextSuffix(TruecallerSdkScope.LOGIN_TEXT_SUFFIX_PLEASE_VERIFY_MOBILE_NO)
                .ctaTextPrefix(TruecallerSdkScope.CTA_TEXT_PREFIX_USE)
                .buttonShapeOptions(TruecallerSdkScope.BUTTON_SHAPE_ROUNDED)
                .privacyPolicyUrl("https://upcheck.app/privacy")
                .termsOfServiceUrl("https://upcheck.app/terms")
                .footerType(TruecallerSdkScope.FOOTER_TYPE_SKIP)
                .consentTitleOption(TruecallerSdkScope.SDK_CONSENT_TITLE_LOG_IN)
                .sdkOptions(TruecallerSdkScope.SDK_OPTION_WITH_OTP)
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
