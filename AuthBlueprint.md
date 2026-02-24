# Upcheck — Authentication Module Blueprint

> **Status:** Production & Deployment Ready Reference
> **Stack:** React Native (Expo) · Supabase Auth · Brevo SMTP · Google OAuth
> **Purpose:** This document is the single source of truth for the entire authentication system. Every configuration value, every state transition, every API call, every error case, and every environment variable is defined here. Follow this exactly and the auth system will work.

---

## Table of Contents

1. [Root Cause: The "No Bearer Token" Bug](#1-root-cause-the-no-bearer-token-bug)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Variables — Complete Reference](#3-environment-variables--complete-reference)
4. [Supabase Project Configuration](#4-supabase-project-configuration)
5. [Brevo SMTP Configuration](#5-brevo-smtp-configuration)
6. [Google OAuth Configuration](#6-google-oauth-configuration)
7. [Auth State Model](#7-auth-state-model)
8. [Complete Auth Flow Diagrams](#8-complete-auth-flow-diagrams)
9. [Backend Implementation](#9-backend-implementation)
10. [Frontend Implementation (React Native)](#10-frontend-implementation-react-native)
11. [Axios Interceptor — Token Injection](#11-axios-interceptor--token-injection)
12. [Deep Link & Redirect Handling](#12-deep-link--redirect-handling)
13. [Email Templates (Brevo)](#13-email-templates-brevo)
14. [Security Hardening](#14-security-hardening)
15. [Error Codes & User-Facing Messages](#15-error-codes--user-facing-messages)
16. [Testing Checklist](#16-testing-checklist)
17. [Deployment Checklist](#17-deployment-checklist)
18. [Common Bugs & Fixes](#18-common-bugs--fixes)

---

## 1. Root Cause: The "No Bearer Token" Bug

Before anything else — here is exactly why you are getting **"No bearer token provided"** on signup and how to fix it.

### What's Happening

This error means your backend API received a request that had **no `Authorization` header** (or an empty/malformed one). There are exactly four causes for this during signup:

---

**Cause A — Signup calls a protected endpoint before the session exists**

Your signup route or a middleware before it is checking for a bearer token. Signup must be a **completely public route**. No auth middleware should run on it.

```
// ❌ WRONG — auth middleware wrapping signup
router.use(authMiddleware);          // this runs on ALL routes
router.post('/auth/signup', signupHandler);

// ✅ CORRECT — signup is outside the protected middleware
router.post('/auth/signup', signupHandler);          // public
router.post('/auth/login', loginHandler);            // public
router.post('/auth/refresh', refreshHandler);        // public
router.use(authMiddleware);                          // only below this line
router.get('/ponds', pondsHandler);                  // protected
```

---

**Cause B — Axios is trying to attach a token that does not yet exist**

Your Axios request interceptor reads the token from the store and attaches it. On signup, the store has no token yet, so it attaches `Authorization: Bearer undefined` or `Bearer null` — and your backend rejects it.

```ts
// ❌ WRONG interceptor
axios.interceptors.request.use((config) => {
  const token = store.getState().accessToken;
  config.headers.Authorization = `Bearer ${token}`;  // sets "Bearer null" ❌
  return config;
});

// ✅ CORRECT interceptor — only attach if token exists
axios.interceptors.request.use((config) => {
  const token = store.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

**Cause C — Supabase client is configured on the backend but the anon key is wrong or missing**

If your backend uses `@supabase/supabase-js` and the `SUPABASE_ANON_KEY` env var is undefined, Supabase initialises without a key and some SDK methods require a bearer token automatically.

```ts
// ❌ Wrong — SUPABASE_ANON_KEY is undefined
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// → SUPABASE_ANON_KEY is undefined → SDK sends no/malformed auth header

// ✅ Always guard env vars at startup
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}
```

---

**Cause D — Google OAuth callback is hitting a protected route**

Your OAuth redirect URI points to a protected API route that requires a token. The callback must be a public route.

```
// ❌ Callback on a protected path
GET /api/v1/protected/auth/callback   ← middleware blocks it

// ✅ Callback on a public path
GET /api/v1/auth/callback/google      ← no middleware
```

---

**Immediate Fix Checklist**

- [ ] Confirm `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/callback/*` have NO auth middleware
- [ ] Update Axios interceptor to only attach token `if (token)`
- [ ] Confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in your backend `.env`
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is set for admin operations (user creation, verification)
- [ ] Confirm Google OAuth callback URL is a public route

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UPCHECK AUTH ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────┐      ┌──────────────────────────────────────┐
  │   React Native App          │      │   Your Backend API (Node/NestJS)     │
  │                             │      │                                      │
  │  ┌─────────────────────┐   │      │  ┌──────────────┐  ┌──────────────┐  │
  │  │ Zustand authStore   │   │      │  │ Auth Routes  │  │ Supabase     │  │
  │  │ • accessToken       │◄──┼──────┼──│ (public)     │  │ Admin Client │  │
  │  │ • refreshToken      │   │      │  │ POST /signup │  │ (service key)│  │
  │  │ • user              │   │      │  │ POST /login  │  └──────┬───────┘  │
  │  │ • isAuthenticated   │   │      │  │ POST /refresh│         │          │
  │  └─────────────────────┘   │      │  │ GET /callback│         │          │
  │                             │      │  └──────────────┘         │          │
  │  ┌─────────────────────┐   │      │                            ▼          │
  │  │ Axios Instance      │   │      │  ┌────────────────────────────────┐  │
  │  │ + interceptors      │──►┼──────┼─►│ Supabase Auth Service          │  │
  │  └─────────────────────┘   │      │  │ • signUp()                     │  │
  │                             │      │  │ • signInWithPassword()         │  │
  │  ┌─────────────────────┐   │      │  │ • signInWithOAuth()            │  │
  │  │ expo-secure-store   │   │      │  │ • refreshSession()             │  │
  │  │ • refreshToken (enc)│   │      │  └──────────────┬───────────────--┘  │
  │  └─────────────────────┘   │      │                 │                    │
  └─────────────────────────────┘      │                 ▼                    │
                                       │  ┌────────────────────────────────┐  │
                                       │  │ Brevo SMTP                     │  │
                                       │  │ • Confirmation emails          │  │
                                       │  │ • Password reset emails        │  │
                                       │  │ • Magic link emails            │  │
                                       │  └────────────────────────────────┘  │
                                       └──────────────────────────────────────┘

                    ┌────────────────────────────────────┐
                    │ Google OAuth 2.0                   │
                    │ • Client → Google consent screen   │
                    │ • Google → Backend callback URL    │
                    │ • Backend → Exchange code → tokens │
                    └────────────────────────────────────┘
```

### Auth Strategy

| Method | Token issuer | Session storage | Refresh mechanism |
|---|---|---|---|
| Email + Password | Supabase Auth (JWT) | expo-secure-store | Supabase refresh token rotation |
| Google OAuth | Supabase Auth (JWT via Google) | expo-secure-store | Supabase refresh token rotation |

Both methods produce the **same session shape** — a Supabase JWT access token and a refresh token. After auth, the rest of the app treats them identically.

---

## 3. Environment Variables — Complete Reference

### 3.1 Backend `.env`

```bash
# ─────────────────────────────────────────
# SUPABASE
# ─────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...      # "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # "service_role" key — NEVER expose to client
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard

# ─────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────
# Found in: Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=https://api.upcheck.app/api/v1/auth/callback/google

# ─────────────────────────────────────────
# JWT (your own tokens, issued by your API)
# ─────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-byte-hex-string>
JWT_REFRESH_SECRET=<64-byte-hex-string-different-from-access>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ─────────────────────────────────────────
# APP URLS
# ─────────────────────────────────────────
APP_URL=https://api.upcheck.app
FRONTEND_DEEP_LINK_SCHEME=upcheck://          # for mobile deep links
FRONTEND_SUCCESS_REDIRECT=upcheck://auth/callback/success
FRONTEND_ERROR_REDIRECT=upcheck://auth/callback/error

# ─────────────────────────────────────────
# NODE ENV
# ─────────────────────────────────────────
NODE_ENV=production
PORT=3000
```

> ⚠️ **CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must NEVER be used in client-side code or exposed in any response. Use it only in backend server code.

---

### 3.2 Frontend `.env` (Expo)

```bash
# Expo environment variables must be prefixed with EXPO_PUBLIC_ to be accessible client-side

# ─────────────────────────────────────────
# API
# ─────────────────────────────────────────
EXPO_PUBLIC_API_BASE_URL=https://api.upcheck.app/api/v1

# ─────────────────────────────────────────
# SUPABASE (client-side — anon key only)
# ─────────────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────
# Found in: Google Cloud Console → OAuth 2.0 Client IDs
# Use the "iOS" client ID for iOS, "Android" for Android
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# ─────────────────────────────────────────
# DEEP LINK
# ─────────────────────────────────────────
EXPO_PUBLIC_APP_SCHEME=upcheck
```

---

### 3.3 `app.json` / `app.config.js` — Required Expo Config

```js
// app.config.js
export default {
  expo: {
    name: "Upcheck",
    slug: "upcheck",
    scheme: "upcheck",                 // ← REQUIRED for deep links / OAuth callbacks
    version: "1.0.0",

    ios: {
      bundleIdentifier: "com.upcheck.app",
      infoPlist: {
        // Required for Google Sign-In on iOS
        GIDClientID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              // Reverse client ID for Google Sign-In
              // Format: com.googleusercontent.apps.XXXXXXXXXX-XXXXXXXX
              `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.split('.')[0]}`
            ]
          }
        ]
      }
    },

    android: {
      package: "com.upcheck.app",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "upcheck",
              host: "auth",
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },

    plugins: [
      ["expo-secure-store"],
      ["@react-native-google-signin/google-signin", {
        iosUrlScheme: `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.split('.')[0]}`
      }]
    ]
  }
};
```

---

## 4. Supabase Project Configuration

### 4.1 Dashboard Settings (Do These First)

**Step 1: Authentication → Providers → Email**
```
Enable Email provider:          ON
Confirm email:                  ON   ← enables email verification
Secure email change:            ON
Double confirm email changes:   ON
```

**Step 2: Authentication → Providers → Google**
```
Enable Google provider:         ON
Client ID:                      [GOOGLE_CLIENT_ID from step 6]
Client Secret:                  [GOOGLE_CLIENT_SECRET from step 6]
Authorized redirect URI:        https://xxxxxxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback
```
> Copy the "Authorized redirect URI" shown in Supabase — you will paste this into Google Cloud Console.

**Step 3: Authentication → URL Configuration**
```
Site URL:                       https://upcheck.app
                                (or exp://your-expo-url for development)

Redirect URLs (add ALL of these):
  https://upcheck.app/auth/callback
  upcheck://auth/callback/success
  upcheck://auth/callback/error
  exp://localhost:8081/--/auth/callback    ← Expo Go development
  exp://192.168.x.x:8081/--/auth/callback ← local device development
```

**Step 4: Authentication → Email Templates**

Set the SMTP provider (next section) BEFORE editing templates or emails won't send.

**Step 5: Project Settings → API**

Note these values for your `.env`:
- `URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
- `JWT Secret` → `SUPABASE_JWT_SECRET`

**Step 6: Authentication → Rate Limits**
```
Email sending rate limit:   4 per hour (default) — adjust for production
SMS rate limit:             N/A
Token refresh rate limit:   360 per hour
```

---

### 4.2 Supabase Client Initialization (Backend)

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Guard env vars — crash early if missing
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    `Missing Supabase env vars.\n` +
    `SUPABASE_URL: ${!!supabaseUrl}\n` +
    `SUPABASE_ANON_KEY: ${!!supabaseAnonKey}\n` +
    `SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceKey}`
  );
}

// Public client — uses anon key, respects RLS
// Use for: verifying user JWTs
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,   // backend manages its own sessions
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Admin client — uses service role key, bypasses RLS
// Use for: creating users, admin password resets, user lookups
// NEVER expose to client
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
```

---

### 4.3 Supabase Client Initialization (Frontend)

```ts
// lib/supabase.ts (React Native)
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter using expo-secure-store for encrypted token storage
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // handle deep links manually
  },
});

// Keep Supabase auth session alive when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

---

## 5. Brevo SMTP Configuration

### 5.1 Brevo Account Setup

1. Log in to [app.brevo.com](https://app.brevo.com)
2. Navigate to: **SMTP & API → SMTP**
3. Generate or copy your SMTP credentials:

```
SMTP Server:    smtp-relay.brevo.com
Port:           587 (TLS/STARTTLS)  ← use this
Port (SSL):     465 (SSL)
Login:          your-brevo-account@email.com
Password:       your-brevo-smtp-password (found in Brevo SMTP settings)
```

4. Verify your **sender domain** in Brevo:
   - Brevo → Senders & IP → Domains → Add & Verify Domain
   - Add the required DNS records (SPF, DKIM, DMARC) to your domain registrar
   - Wait for verification (5–30 min)

### 5.2 Configure Brevo as Supabase SMTP

In Supabase Dashboard → **Project Settings → Auth → SMTP Settings**:

```
Enable Custom SMTP:   ON

Host:                 smtp-relay.brevo.com
Port:                 587
Username:             your-brevo-account@email.com
Password:             your-brevo-smtp-password
Sender name:          Upcheck
Sender email:         noreply@upcheck.app     ← must be verified in Brevo
```

After saving, click **"Send test email"** to verify the connection. If it fails:
- Check the sender email is verified in Brevo
- Confirm the SMTP password (not API key — they're different in Brevo)
- Ensure port 587 is not blocked by your hosting provider

### 5.3 Brevo DNS Records (Add to Your Domain)

```dns
# SPF — allows Brevo to send on your behalf
TXT  @    v=spf1 include:spf.brevo.com ~all

# DKIM — Brevo will give you the specific value after domain setup
TXT  mail._domainkey    [value from Brevo dashboard]

# DMARC — prevents spoofing, sends reports to you
TXT  _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@upcheck.app
```

### 5.4 Brevo Rate Limits to Know

| Plan | Emails/day | Emails/month |
|---|---|---|
| Free | 300 | 9,000 |
| Starter | unlimited | 20,000 |
| Business | unlimited | custom |

For production, use **Starter** minimum to avoid hitting the 300/day limit.

---

## 6. Google OAuth Configuration

### 6.1 Google Cloud Console Setup

**Step 1: Create/Select Project**
- Go to [console.cloud.google.com](https://console.cloud.google.com)
- Create a new project: "Upcheck"

**Step 2: Enable APIs**
- APIs & Services → Library → search "Google+ API" → Enable
- APIs & Services → Library → search "Google Identity" → Enable

**Step 3: Configure OAuth Consent Screen**
- APIs & Services → OAuth consent screen
- User Type: External
- App name: Upcheck
- User support email: support@upcheck.app
- App logo: upload upcheck logo
- Authorized domains: `upcheck.app`
- Developer contact: your email
- Scopes: add `email`, `profile`, `openid`
- Test users: add your test emails during development

**Step 4: Create OAuth 2.0 Credentials**

Create THREE separate credentials:

**A. Web Application** (for your backend callback + Supabase)
```
Application type:         Web application
Name:                     Upcheck Backend
Authorized redirect URIs:
  https://xxxxxxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback
  https://api.upcheck.app/api/v1/auth/callback/google
```
→ Save the **Client ID** and **Client Secret** → these go in your backend `.env` and Supabase dashboard

**B. iOS**
```
Application type:         iOS
Name:                     Upcheck iOS
Bundle ID:                com.upcheck.app
```
→ Save the **Client ID** → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

**C. Android**
```
Application type:         Android
Name:                     Upcheck Android
Package name:             com.upcheck.app
SHA-1 certificate fingerprint:
  [run: keytool -keystore your-keystore.jks -list -v]
  [for Expo: eas credentials → Android → SHA-1]
```
→ Save the **Client ID** → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### 6.2 Authorized Redirect URI Summary

| Where | Redirect URI |
|---|---|
| Supabase Dashboard (Google Provider) | `https://xxxx.supabase.co/auth/v1/callback` |
| Google Cloud Console (Web App) | `https://xxxx.supabase.co/auth/v1/callback` |
| Google Cloud Console (Web App) | `https://api.upcheck.app/api/v1/auth/callback/google` |
| Supabase URL Configuration | `upcheck://auth/callback/success` |
| Supabase URL Configuration | `upcheck://auth/callback/error` |

---

## 7. Auth State Model

### 7.1 Session Shape

Every successful auth operation (email login, signup after verification, Google OAuth) returns this session shape from Supabase:

```ts
interface SupabaseSession {
  access_token: string;        // JWT, expires in 1 hour (Supabase default)
  refresh_token: string;       // long-lived, used to get new access tokens
  expires_in: number;          // seconds until access_token expires (3600)
  expires_at: number;          // unix timestamp of expiry
  token_type: 'bearer';
  user: SupabaseUser;
}

interface SupabaseUser {
  id: string;                  // UUID — use this as your primary user ID
  email: string;
  email_confirmed_at: string | null;   // null if not yet verified
  phone: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string;
  app_metadata: {
    provider: 'email' | 'google';
    providers: string[];
  };
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    name?: string;             // from Google
    picture?: string;          // from Google
  };
}
```

### 7.2 Auth Store (Zustand)

```ts
// store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus =
  | 'initializing'       // app just launched, checking stored session
  | 'unauthenticated'    // no session, show login screen
  | 'awaiting_verification' // signed up but email not confirmed
  | 'authenticated'      // fully logged in
  | 'refreshing';        // access token being refreshed

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: 'email' | 'google';
  emailVerified: boolean;
}

interface AuthState {
  // ── Core State ──
  status: AuthStatus;
  user: AuthUser | null;
  session: Session | null;

  // ── Derived (computed from session) ──
  accessToken: string | null;
  isAuthenticated: boolean;

  // ── Pending verification ──
  pendingVerificationEmail: string | null;

  // ── Error ──
  lastError: string | null;

  // ── Actions ──
  setSession: (session: Session) => void;
  setStatus: (status: AuthStatus) => void;
  setPendingVerification: (email: string) => void;
  clearPendingVerification: () => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
  hydrateFromSupabaseUser: (user: User, session: Session) => void;
}

const mapSupabaseUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email!,
  name:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email!.split('@')[0],
  avatarUrl:
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null,
  provider: (user.app_metadata?.provider as 'email' | 'google') || 'email',
  emailVerified: !!user.email_confirmed_at,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      status: 'initializing',
      user: null,
      session: null,
      accessToken: null,
      isAuthenticated: false,
      pendingVerificationEmail: null,
      lastError: null,

      setSession: (session) =>
        set({
          session,
          accessToken: session.access_token,
          user: mapSupabaseUser(session.user),
          isAuthenticated: true,
          status: 'authenticated',
          lastError: null,
        }),

      setStatus: (status) => set({ status }),

      setPendingVerification: (email) =>
        set({
          pendingVerificationEmail: email,
          status: 'awaiting_verification',
        }),

      clearPendingVerification: () =>
        set({ pendingVerificationEmail: null }),

      setError: (lastError) => set({ lastError }),

      clearSession: () =>
        set({
          session: null,
          accessToken: null,
          user: null,
          isAuthenticated: false,
          status: 'unauthenticated',
          pendingVerificationEmail: null,
          lastError: null,
        }),

      hydrateFromSupabaseUser: (user, session) =>
        set({
          session,
          accessToken: session.access_token,
          user: mapSupabaseUser(user),
          isAuthenticated: true,
          status: 'authenticated',
        }),
    }),
    {
      name: 'upcheck-auth',
      storage: createJSONStorage(() => ({
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      })),
      // Only persist these fields — never persist accessToken in plain storage
      partialize: (state) => ({
        user: state.user,
        pendingVerificationEmail: state.pendingVerificationEmail,
        // session.refresh_token is persisted by Supabase client's own storage adapter
        // accessToken is NOT persisted — always refreshed on app launch
      }),
    }
  )
);
```

### 7.3 Auth Status Transitions

```
          ┌─────────────────┐
App Launch│                 │
─────────►│  initializing   │
          │                 │
          └────────┬────────┘
                   │
         Check Supabase session
                   │
        ┌──────────┴──────────┐
        │                     │
  Session found           No session
  & valid                     │
        │                     ▼
        │            ┌─────────────────┐
        │            │ unauthenticated │◄─── logout / token error
        │            └────────┬────────┘
        │                     │
        │              User takes action
        │                     │
        │         ┌───────────┼───────────┐
        │         │           │           │
        │      Sign Up     Sign In    Google
        │         │           │       OAuth
        │         │           │           │
        │         ▼           │           │
        │  ┌──────────────┐  │           │
        │  │   awaiting_  │  │           │
        │  │ verification │  │           │
        │  └──────┬───────┘  │           │
        │         │          │           │
        │    User clicks      │           │
        │    confirm link     │           │
        │         │          │           │
        └─────────▼──────────▼───────────▼
                  │
                  ▼
          ┌───────────────┐
          │ authenticated │◄─── token refresh (transparent)
          └───────┬───────┘
                  │
             User logs out
                  │
                  ▼
          ┌─────────────────┐
          │ unauthenticated │
          └─────────────────┘
```

---

## 8. Complete Auth Flow Diagrams

### 8.1 Email Signup Flow

```
[User fills signup form: name, email, password]
              │
              ▼
    [Client-side validation]
    • email: valid format
    • password: min 8 chars, 1 uppercase, 1 number
    • name: required, 2–100 chars
              │
              │ FAIL → show inline errors
              │ PASS ↓
              ▼
    POST /api/v1/auth/signup
    Body: { name, email, password }
              │
              ▼
    [Backend: supabaseAdmin.auth.signUp()]
    • Creates user in auth.users
    • Supabase sends confirmation email via Brevo SMTP
    • User is created with email_confirmed_at = NULL
              │
    ┌─────────┴─────────┐
    │                   │
  Error             Success
    │                   │
  409 (email         Returns:
  exists)            { message: 'Check your email' }
    │                   │
    ▼                   ▼
  Show error    authStore.setPendingVerification(email)
  "Email        Navigate → VerifyEmailScreen
  already in    (shows: "Check your inbox at {email}")
  use"
              │
              │ User checks email, clicks confirm link
              │
              ▼
    [Supabase confirmation URL clicked]
    → Redirects to: upcheck://auth/callback/success?
                    access_token=...&refresh_token=...&type=signup
              │
              ▼
    [App deep link handler catches URL]
    → Parses tokens from URL params
              │
              ▼
    [supabase.auth.setSession({ access_token, refresh_token })]
              │
              ▼
    authStore.setSession(session)
    authStore.clearPendingVerification()
    Navigate → Main App (Home/Farms screen)
```

---

### 8.2 Email Login Flow

```
[User fills login form: email, password]
              │
              ▼
    POST /api/v1/auth/login
    Body: { email, password }
              │
              ▼
    [Backend: supabaseAdmin.auth.signInWithPassword()]
              │
    ┌─────────┴────────────────────────┐
    │                                  │
  Error                            Success
    │                                  │
  400 invalid_credentials          Returns session object
  401 email_not_confirmed           { access_token, refresh_token,
    │                                 expires_at, user }
    │                                  │
  Map to                               ▼
  user message                 [Backend mints its own JWT]
    │                          OR [Returns Supabase session directly]
    │                                  │
    ▼                                  ▼
  Show error:               POST response:
  "Wrong email              {
  or password"                accessToken: session.access_token,
                              refreshToken: session.refresh_token,
  OR                          expiresAt: session.expires_at,
                              user: { id, email, name, ... }
  "Please verify            }
  your email first.               │
  [Resend email]"                 ▼
                          authStore.setSession(session)
                          Navigate → Main App
```

---

### 8.3 Google OAuth Flow (Mobile)

```
[User taps "Continue with Google"]
              │
              ▼
    [GoogleSignin.signIn()]                     ← @react-native-google-signin
              │
              ▼
    [Google OS consent sheet opens]
    User selects Google account
              │
    ┌─────────┴─────────┐
    │                   │
  Cancelled          Success
    │                   │
  (do nothing)    { idToken, user: { id, email, name, photo } }
                        │
                        ▼
    POST /api/v1/auth/google
    Body: { idToken }
                        │
                        ▼
    [Backend: supabaseAdmin.auth.signInWithIdToken()]
    Supabase verifies idToken with Google
    Creates/finds user in auth.users
    Returns session
                        │
    ┌─────────┴─────────┐
    │                   │
  Error             Success
    │                   │
  Show error        Returns: { accessToken, refreshToken, user }
                        │
                        ▼
                authStore.setSession(session)
                Navigate → Main App
                (if new user, show onboarding screen)
```

---

### 8.4 Token Refresh Flow

```
[Any API request made]
              │
              ▼
    [Axios request interceptor]
    Attach: Authorization: Bearer {accessToken}
              │
              ▼
    [API response received]
              │
    ┌─────────┴─────────┐
    │                   │
  Non-401           401 Unauthorized
    │                   │
  Normal flow    [Axios response interceptor]
                        │
                        ▼
              Is a refresh already in progress?
                        │
              ┌─────────┴─────────┐
              │                   │
             YES                  NO
              │                   │
              │         [supabase.auth.refreshSession()]
              │         OR POST /api/v1/auth/refresh
              │                   │
              │         ┌─────────┴─────────┐
              │         │                   │
              │       Error             Success
              │         │                   │
              │    (refresh_token       authStore.setSession()
              │    expired/invalid)          │
              │         │              Retry original request
              │         ▼              with new access_token
              │    authStore.clearSession()
              │    Navigate → Login
              │         │
              └─────────┘
```

---

### 8.5 Password Reset Flow

```
[User taps "Forgot Password" on login screen]
              │
              ▼
    [Reset Password Screen]
    User enters email
              │
              ▼
    POST /api/v1/auth/forgot-password
    Body: { email }
              │
              ▼
    [Backend: supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'upcheck://auth/callback/reset-password'
    })]
    Supabase sends password reset email via Brevo
              │
              ▼
    Response: 200 OK (always — don't reveal if email exists)
    Show: "If that email is registered, a reset link has been sent."
              │
              │ User clicks link in email
              │
              ▼
    Deep link opens: upcheck://auth/callback/reset-password
                     ?access_token=...&refresh_token=...&type=recovery
              │
              ▼
    [App detects type=recovery in URL]
    Navigate → NewPasswordScreen (access token stored temporarily)
              │
              ▼
    User enters new password (min 8 chars)
              │
              ▼
    [supabase.auth.updateUser({ password: newPassword })]
    Uses the recovery access_token from the URL
              │
    ┌─────────┴─────────┐
    │                   │
  Error             Success
    │                   │
  Show error        Show: "Password updated successfully"
                    Navigate → Login screen
                    Clear recovery token from memory
```

---

### 8.6 Logout Flow

```
[User taps Logout]
              │
              ▼
    [Show confirmation: "Are you sure?"] (optional)
              │
              ▼
    POST /api/v1/auth/logout   (fire and forget — best effort)
              │
              ▼
    [supabase.auth.signOut()]  (client-side — clears Supabase session)
              │
              ▼
    authStore.clearSession()
    queryClient.clear()         ← clear all TanStack Query cache
    activeFarmStore.clearAll()
    notificationStore.clearAll()
              │
              ▼
    Navigate → Login Screen
    (clear navigation stack — user can't go back)
```

---

### 8.7 App Launch / Session Hydration Flow

```
[App opens]
              │
              ▼
    authStore.status = 'initializing'
    RootNavigator shows SplashScreen
              │
              ▼
    [supabase.auth.getSession()]
    Reads session from expo-secure-store
              │
    ┌─────────┴──────────────────┐
    │                            │
  No session                 Session found
    │                            │
    │                   Is access_token expired?
    │                            │
    │                  ┌─────────┴─────────┐
    │                  │                   │
    │              Expired            Not expired
    │                  │                   │
    │          [supabase.auth              │
    │           .refreshSession()]         │
    │                  │                   │
    │         ┌────────┴────────┐          │
    │         │                 │          │
    │       Error           Success        │
    │         │                 │          │
    ▼         ▼                 └────┬─────┘
  authStore   authStore              │
  .setStatus  .clearSession()        ▼
  ('unauthenticated')        authStore.setSession(session)
              │              authStore.status = 'authenticated'
              ▼                      │
    Navigate → AuthStack     Navigate → MainStack
    (Login screen)
```

---

## 9. Backend Implementation

### 9.1 Route Definitions (Express / NestJS Pattern)

```ts
// routes/auth.routes.ts

// ─────────────────────────────────────────
// PUBLIC ROUTES — NO AUTH MIDDLEWARE
// ─────────────────────────────────────────

router.post('/auth/signup',          authController.signup);
router.post('/auth/login',           authController.login);
router.post('/auth/logout',          authController.logout);     // best effort, no auth required
router.post('/auth/refresh',         authController.refresh);
router.post('/auth/forgot-password', authController.forgotPassword);
router.get ('/auth/callback/google', authController.googleCallback);

// ─────────────────────────────────────────
// PROTECTED ROUTES — AUTH MIDDLEWARE REQUIRED
// ─────────────────────────────────────────

router.use(authMiddleware);   // ← everything below this line requires auth

router.get ('/auth/me',       authController.getMe);
router.put ('/auth/profile',  authController.updateProfile);
router.post('/auth/password', authController.changePassword);
router.delete('/auth/account', authController.deleteAccount);
```

---

### 9.2 Auth Middleware

```ts
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'No authorization header provided',
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization header must use Bearer scheme',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'No bearer token provided',   // ← THIS is the error you were seeing
    });
  }

  // 2. Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
      supabaseError: error?.message,
    });
  }

  // 3. Attach user to request
  req.user = {
    id: user.id,
    email: user.email!,
    provider: user.app_metadata.provider,
  };

  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        provider: string;
      };
    }
  }
}
```

---

### 9.3 Auth Controller — All Handlers

```ts
// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';

// ── SIGNUP ────────────────────────────────────────────────────
export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'name, email, and password are required',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Password must be at least 8 characters',
    });
  }

  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,        // stored in user_metadata
      },
      emailRedirectTo: process.env.FRONTEND_SUCCESS_REDIRECT,
    },
  });

  if (error) {
    // Map Supabase errors to user-friendly messages
    if (error.message.includes('already registered')) {
      return res.status(409).json({
        error: 'email_exists',
        message: 'An account with this email already exists',
      });
    }
    return res.status(400).json({
      error: 'signup_failed',
      message: error.message,
    });
  }

  // data.user exists but session is null until email is confirmed
  return res.status(201).json({
    message: 'Account created. Check your email to confirm your account.',
    userId: data.user?.id,
  });
};

// ── LOGIN ─────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'email and password are required',
    });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return res.status(401).json({
        error: 'email_not_confirmed',
        message: 'Please verify your email before logging in',
      });
    }
    if (error.message.includes('Invalid login credentials')) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Incorrect email or password',
      });
    }
    return res.status(401).json({
      error: 'login_failed',
      message: error.message,
    });
  }

  const { session, user } = data;

  return res.status(200).json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    tokenType: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatarUrl: user.user_metadata?.avatar_url || null,
      provider: user.app_metadata?.provider || 'email',
      emailVerified: !!user.email_confirmed_at,
    },
  });
};

// ── REFRESH ───────────────────────────────────────────────────
export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'refreshToken is required',
    });
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return res.status(401).json({
      error: 'refresh_failed',
      message: 'Refresh token is invalid or expired. Please log in again.',
    });
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    tokenType: 'bearer',
  });
};

// ── LOGOUT ────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  // Best effort — sign out even without a token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null') {
      await supabaseAdmin.auth.admin.signOut(token).catch(() => {});
    }
  }
  return res.status(200).json({ message: 'Logged out successfully' });
};

// ── GOOGLE OAUTH CALLBACK ─────────────────────────────────────
export const googleCallback = async (req: Request, res: Response) => {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(
      `${process.env.FRONTEND_ERROR_REDIRECT}?error=${oauthError}`
    );
  }

  if (!code) {
    return res.redirect(
      `${process.env.FRONTEND_ERROR_REDIRECT}?error=no_code`
    );
  }

  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(
    code as string
  );

  if (error || !data.session) {
    return res.redirect(
      `${process.env.FRONTEND_ERROR_REDIRECT}?error=exchange_failed`
    );
  }

  const { session } = data;
  return res.redirect(
    `${process.env.FRONTEND_SUCCESS_REDIRECT}` +
    `?access_token=${session.access_token}` +
    `&refresh_token=${session.refresh_token}` +
    `&expires_at=${session.expires_at}` +
    `&provider=google`
  );
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'email is required',
    });
  }

  await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: 'upcheck://auth/callback/reset-password',
  });

  // Always return 200 — don't reveal whether email exists
  return res.status(200).json({
    message: 'If that email is registered, a password reset link has been sent.',
  });
};

// ── GET ME ────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  // req.user is set by authMiddleware
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.user!.id);

  if (error || !data.user) {
    return res.status(404).json({ error: 'user_not_found', message: 'User not found' });
  }

  const user = data.user;
  return res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email!.split('@')[0],
    avatarUrl: user.user_metadata?.avatar_url || null,
    provider: user.app_metadata?.provider || 'email',
    emailVerified: !!user.email_confirmed_at,
    createdAt: user.created_at,
  });
};
```

---

## 10. Frontend Implementation (React Native)

### 10.1 Auth Service (Abstraction Layer)

```ts
// services/authService.ts
// Single entry point for all auth operations from React Native

import { supabase } from '@/lib/supabase';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// ── Initialize Google Sign-In (call once at app startup) ──────
export const initGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
};

// ── Email Sign Up ─────────────────────────────────────────────
export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await apiClient.post('/auth/signup', {
      name, email, password,
    });

    useAuthStore.getState().setPendingVerification(email);
    return { success: true };
  } catch (error: any) {
    const message =
      error.response?.data?.message || 'Signup failed. Please try again.';
    return { success: false, error: message };
  }
};

// ── Email Sign In ─────────────────────────────────────────────
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password });

    // Build a Supabase-compatible session shape
    await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      useAuthStore.getState().setSession(sessionData.session);
    }

    return { success: true };
  } catch (error: any) {
    const errorCode = error.response?.data?.error;
    const message =
      error.response?.data?.message || 'Login failed. Please try again.';
    return { success: false, error: message, errorCode };
  }
};

// ── Google Sign In ────────────────────────────────────────────
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  error?: string;
  cancelled?: boolean;
}> => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const googleUser = await GoogleSignin.signIn();
    const idToken = googleUser.data?.idToken;

    if (!idToken) {
      return { success: false, error: 'Google sign-in did not return an ID token' };
    }

    const { data } = await apiClient.post('/auth/google', { idToken });

    await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      useAuthStore.getState().setSession(sessionData.session);
    }

    return { success: true };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in already in progress' };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services not available' };
    }
    const message =
      error.response?.data?.message || 'Google sign-in failed. Please try again.';
    return { success: false, error: message };
  }
};

// ── Sign Out ──────────────────────────────────────────────────
export const signOut = async (): Promise<void> => {
  // 1. Invalidate token on server (best effort)
  await apiClient.post('/auth/logout').catch(() => {});

  // 2. Clear Supabase session
  await supabase.auth.signOut();

  // 3. Clear all app state
  const { clearSession } = useAuthStore.getState();
  clearSession();
  queryClient.clear();

  // 4. Clear Google session if signed in with Google
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) await GoogleSignin.signOut();
  } catch {}
};

// ── Forgot Password ───────────────────────────────────────────
export const requestPasswordReset = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiClient.post('/auth/forgot-password', { email });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to send reset email',
    };
  }
};

// ── Handle Deep Link Callback ─────────────────────────────────
export const handleAuthCallback = async (url: string): Promise<void> => {
  const { setSession, setStatus, setError } = useAuthStore.getState();

  // Parse URL params
  const urlObj = new URL(url);
  const params = Object.fromEntries(urlObj.searchParams.entries());

  // Also check hash fragments (Supabase sometimes uses #)
  const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
  const allParams = { ...params, ...Object.fromEntries(hashParams.entries()) };

  const { access_token, refresh_token, error, type } = allParams;

  if (error) {
    setError(error);
    setStatus('unauthenticated');
    return;
  }

  if (access_token && refresh_token) {
    try {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError || !data.session) {
        throw sessionError || new Error('Failed to set session');
      }

      setSession(data.session);

      // Clear pending verification if this was a signup confirmation
      if (type === 'signup') {
        useAuthStore.getState().clearPendingVerification();
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('unauthenticated');
    }
  }
};
```

---

### 10.2 Auth Initialization (App Root)

```ts
// hooks/useAuthInitializer.ts
// Call this in your root component (app/_layout.tsx)

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { initGoogleSignIn } from '@/services/authService';

export const useAuthInitializer = () => {
  const { setSession, setStatus, status } = useAuthStore();

  useEffect(() => {
    // 1. Initialize Google Sign-In
    initGoogleSignIn();

    // 2. Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        setStatus('unauthenticated');
      }
    });

    // 3. Listen for auth state changes (handles token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().clearSession();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        } else if (event === 'USER_UPDATED' && session) {
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { isInitializing: status === 'initializing' };
};
```

---

### 10.3 Root Navigator (Auth Gating)

```tsx
// navigation/RootNavigator.tsx
import { useAuthStore } from '@/store/authStore';
import { useAuthInitializer } from '@/hooks/useAuthInitializer';
import { useDeepLinkHandler } from '@/hooks/useDeepLinkHandler';

export const RootNavigator = () => {
  const { status } = useAuthStore();
  const { isInitializing } = useAuthInitializer();
  useDeepLinkHandler();

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {status === 'authenticated'
        ? <MainStackNavigator />
        : <AuthStackNavigator />
      }
    </NavigationContainer>
  );
};

// AuthStackNavigator includes:
// - LoginScreen
// - RegisterScreen
// - ForgotPasswordScreen
// - VerifyEmailScreen (status === 'awaiting_verification')
// - NewPasswordScreen (for reset-password deep link)
```

---

### 10.4 Verify Email Screen

```tsx
// screens/auth/VerifyEmailScreen.tsx
// Shown after signup — user is waiting to click confirm email

import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';

const VerifyEmailScreen = () => {
  const { pendingVerificationEmail } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const resendVerificationEmail = async () => {
    if (!pendingVerificationEmail) return;
    setResending(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: pendingVerificationEmail,
        options: {
          emailRedirectTo: process.env.EXPO_PUBLIC_APP_SCHEME + '://auth/callback/success'
        }
      });
      setResent(true);
    } catch {
      // show error
    } finally {
      setResending(false);
    }
  };

  return (
    <View>
      <Text>Check your email</Text>
      <Text>We sent a confirmation link to {pendingVerificationEmail}</Text>
      <Text>Tap the link in the email to activate your account.</Text>

      <Button
        label={resent ? "Email sent!" : "Resend email"}
        onPress={resendVerificationEmail}
        loading={resending}
        disabled={resent}
      />

      <Button
        label="Use a different email"
        onPress={() => {
          useAuthStore.getState().clearSession();
          navigation.navigate('Register');
        }}
        variant="text"
      />
    </View>
  );
};
```

---

## 11. Axios Interceptor — Token Injection

This is one of the most critical pieces. Get this wrong and you get "No bearer token" errors.

```ts
// api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────
// Attach bearer token to every request — ONLY if token exists
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If no token: let the request go without Authorization header.
    // The backend will return 401 if the endpoint requires auth,
    // which is the correct behavior.

    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────
// Handle 401 — attempt token refresh, retry original request
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshComplete = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite loops — don't retry refresh or login endpoints
    if (
      originalRequest._isRetried ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/signup')
    ) {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    // Start refresh
    isRefreshing = true;
    originalRequest._isRetried = true;

    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !session) {
        throw refreshError || new Error('Refresh failed');
      }

      // Update store with new session
      useAuthStore.getState().setSession(session);
      const newToken = session.access_token;

      // Notify all queued requests
      onRefreshComplete(newToken);
      isRefreshing = false;

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshErr) {
      isRefreshing = false;
      refreshSubscribers = [];
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshErr);
    }
  }
);
```

---

## 12. Deep Link & Redirect Handling

### 12.1 Deep Link Handler Hook

```ts
// hooks/useDeepLinkHandler.ts
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { handleAuthCallback } from '@/services/authService';
import { useNavigation } from '@react-navigation/native';

export const useDeepLinkHandler = () => {
  const navigation = useNavigation();

  const handleUrl = async (url: string) => {
    if (!url) return;

    // Auth callbacks
    if (url.includes('auth/callback')) {
      await handleAuthCallback(url);

      // If it's a password reset, navigate to new password screen
      if (url.includes('type=recovery') || url.includes('reset-password')) {
        navigation.navigate('NewPassword' as never);
      }
    }
  };

  useEffect(() => {
    // Handle URL if app was opened by a link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle URL when app is already open (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);
};
```

### 12.2 Expo Go Deep Link Setup (Development)

During development with Expo Go, deep links use the format:
```
exp://192.168.x.x:8081/--/auth/callback/success
```

Add this to your Supabase Redirect URLs list for development.

In production (standalone app), it becomes:
```
upcheck://auth/callback/success
```

### 12.3 Deep Link URL Anatomy

```
upcheck://auth/callback/success
  ?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  &refresh_token=v1.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  &expires_at=1740000000
  &token_type=bearer
  &type=signup          ← 'signup' | 'recovery' | 'magiclink'
  &provider=email       ← 'email' | 'google'
```

---

## 13. Email Templates (Brevo)

### 13.1 Configure Email Templates in Supabase

In Supabase Dashboard → Authentication → Email Templates, configure each template to use Brevo styling.

**Confirmation Email Template:**
```html
<h2>Confirm your Upcheck account</h2>
<p>Hi there,</p>
<p>Thank you for signing up for Upcheck. Please confirm your email address to get started.</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="background: linear-gradient(135deg, #0B6DC7, #00CDE8);
            color: white; padding: 12px 28px; border-radius: 100px;
            text-decoration: none; font-weight: 600; display: inline-block;">
    Confirm Email Address
  </a>
</p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an Upcheck account, you can safely ignore this email.</p>
<br>
<small>Upcheck — Reinventing Aquaculture</small>
```

**Password Reset Email Template:**
```html
<h2>Reset your Upcheck password</h2>
<p>We received a request to reset the password for your account.</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="background: linear-gradient(135deg, #0B6DC7, #00CDE8);
            color: white; padding: 12px 28px; border-radius: 100px;
            text-decoration: none; font-weight: 600; display: inline-block;">
    Reset Password
  </a>
</p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request a password reset, please ignore this email. Your password will not change.</p>
```

**Sender Configuration:**
```
From name:    Upcheck
From email:   noreply@upcheck.app   ← must be verified in Brevo
Subject (confirm):  Confirm your Upcheck account
Subject (reset):    Reset your Upcheck password
```

---

## 14. Security Hardening

### 14.1 Rate Limiting (Backend)

```ts
// Apply to all auth routes
import rateLimit from 'express-rate-limit';

// Strict limit on signup/login
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 attempts per IP
  message: {
    error: 'too_many_requests',
    message: 'Too many attempts. Try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Less strict for password reset (to prevent account enumeration timing attacks)
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,                      // 3 attempts per IP
  message: {
    error: 'too_many_requests',
    message: 'Too many reset requests. Try again in 1 hour.',
  },
});

// Apply:
router.post('/auth/signup', authRateLimit, signupHandler);
router.post('/auth/login',  authRateLimit, loginHandler);
router.post('/auth/forgot-password', forgotPasswordRateLimit, forgotPasswordHandler);
```

### 14.2 Input Sanitization

```ts
// Install: npm install validator
import validator from 'validator';

// In signup handler:
const sanitizedEmail = validator.normalizeEmail(email) || '';
const sanitizedName = validator.escape(name.trim());

if (!validator.isEmail(sanitizedEmail)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

if (!validator.isLength(sanitizedName, { min: 2, max: 100 })) {
  return res.status(400).json({ error: 'Name must be 2–100 characters' });
}
```

### 14.3 Security Headers

```ts
// Install: npm install helmet
import helmet from 'helmet';
app.use(helmet());

// Important headers this adds:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security (HTTPS only)
// X-XSS-Protection: 0 (modern browsers handle this)
```

### 14.4 CORS Configuration

```ts
import cors from 'cors';

const allowedOrigins = [
  'https://upcheck.app',
  'upcheck://',
  // Expo Go during development:
  'exp://localhost:8081',
  'exp://192.168.0.0/16',   // local network range — restrict further in prod
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,   // preflight cache: 24 hours
}));
```

### 14.5 Token Security Rules

| Rule | Implementation |
|---|---|
| Access token never stored in AsyncStorage | Use expo-secure-store (encrypted) |
| Refresh token never in Redux/Zustand plain state | Managed by Supabase client's own storage |
| `SUPABASE_SERVICE_ROLE_KEY` never in frontend code | Backend only, checked at startup |
| Access token never logged | Remove from console.log calls |
| Tokens never in URL params (except deep link callbacks) | Use request body for token exchange |
| HTTPS only in production | Enforce via HSTS header |

---

## 15. Error Codes & User-Facing Messages

### 15.1 Backend Error Response Shape

```ts
// All errors follow this shape:
{
  error: string;      // machine-readable code
  message: string;    // human-readable description
  details?: any;      // optional extra info (dev mode only)
}
```

### 15.2 Complete Error Code Map

| Backend Error Code | HTTP Status | User-Facing Message |
|---|---|---|
| `validation_error` | 400 | Show field-specific error |
| `email_exists` | 409 | "An account with this email already exists" |
| `invalid_credentials` | 401 | "Incorrect email or password" |
| `email_not_confirmed` | 401 | "Please verify your email. [Resend email]" |
| `refresh_failed` | 401 | "Session expired. Please log in again." |
| `token_invalid` | 401 | "Session expired. Please log in again." |
| `user_not_found` | 404 | "Account not found" |
| `signup_failed` | 400 | "Signup failed. Please try again." |
| `login_failed` | 400 | "Login failed. Please try again." |
| `too_many_requests` | 429 | "Too many attempts. Try again in 15 minutes." |
| `google_auth_failed` | 400 | "Google sign-in failed. Please try again." |
| `exchange_failed` | 400 | "Authentication failed. Please try again." |
| Network error | — | "No connection. Check your internet and try again." |
| Timeout | — | "Request timed out. Please try again." |
| Unknown server error | 500 | "Something went wrong. Please try again." |

### 15.3 Frontend Error Handling Utility

```ts
// utils/authErrors.ts
export const getAuthErrorMessage = (error: any): string => {
  // Axios error with backend response
  const code = error?.response?.data?.error;
  const serverMessage = error?.response?.data?.message;

  const errorMap: Record<string, string> = {
    email_exists: 'An account with this email already exists.',
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Please verify your email address first.',
    refresh_failed: 'Your session has expired. Please log in again.',
    token_invalid: 'Your session has expired. Please log in again.',
    too_many_requests: 'Too many attempts. Please wait 15 minutes and try again.',
    google_auth_failed: 'Google sign-in failed. Please try again.',
  };

  if (code && errorMap[code]) return errorMap[code];
  if (serverMessage) return serverMessage;

  // Network / no response
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    return 'No internet connection. Please check your network.';
  }

  return 'Something went wrong. Please try again.';
};
```

---

## 16. Testing Checklist

### 16.1 Email Auth Tests

```
[ ] Sign up with new email
    Expected: 201 response, "Check your email" message
    Auth store: status = 'awaiting_verification', pendingVerificationEmail set

[ ] Click confirmation link in email
    Expected: deep link opens app, session set, navigates to main app
    Auth store: status = 'authenticated', user populated

[ ] Attempt sign up with existing email
    Expected: 409 error, "Email already exists" message shown

[ ] Sign in with correct credentials (verified email)
    Expected: 200 response, tokens returned, navigates to main app

[ ] Sign in with wrong password
    Expected: 401 'invalid_credentials', error message shown

[ ] Sign in with unverified email
    Expected: 401 'email_not_confirmed', "Verify your email" message + resend button

[ ] Forgot password with registered email
    Expected: 200, "Reset link sent" message (even if email doesn't exist)

[ ] Forgot password with unregistered email
    Expected: 200 (same message — no email enumeration)

[ ] Click password reset link
    Expected: deep link opens app, navigates to NewPasswordScreen

[ ] Submit new password on reset screen
    Expected: password updated, redirect to login

[ ] Submit weak password (< 8 chars)
    Expected: validation error shown before API call
```

### 16.2 Google OAuth Tests

```
[ ] Tap "Continue with Google", select account
    Expected: Google consent screen, then session set in app

[ ] Cancel Google consent screen
    Expected: No error shown, stays on login screen

[ ] Google sign-in on device with no Google account
    Expected: Appropriate error message

[ ] First-time Google sign-in (new user)
    Expected: User created in Supabase, session set, navigate to main app

[ ] Repeat Google sign-in (existing user)
    Expected: Existing user found, session set, navigate to main app
```

### 16.3 Token & Session Tests

```
[ ] API call with valid token
    Expected: 200 response

[ ] API call with expired access token
    Expected: Axios interceptor triggers refresh, original request retried

[ ] API call with expired refresh token
    Expected: Forced logout, navigate to login screen

[ ] Protected endpoint called without token
    Expected: 401 'No bearer token provided' (correct) or 'No authorization header'

[ ] Multiple simultaneous 401 errors (race condition)
    Expected: Only ONE refresh request made, all queued requests retry with new token

[ ] App launched with valid stored session
    Expected: SplashScreen briefly, then main app (no login required)

[ ] App launched with expired stored session
    Expected: SplashScreen → refresh attempt → if refresh fails → login screen
```

### 16.4 Brevo / Email Delivery Tests

```
[ ] Confirmation email received within 60 seconds of signup
[ ] Reset email received within 60 seconds of request
[ ] Emails render correctly on iOS Mail
[ ] Emails render correctly on Gmail
[ ] Confirmation link works (not expired, redirects correctly)
[ ] Reset link works (not expired, redirects correctly)
[ ] SPF/DKIM/DMARC pass (check with mail-tester.com)
```

---

## 17. Deployment Checklist

### Before Going to Production

**Supabase**
- [ ] Custom SMTP configured with Brevo and tested (send test email)
- [ ] Site URL set to production URL
- [ ] All redirect URLs added (production deep links)
- [ ] Email templates styled and tested
- [ ] Rate limits reviewed and set appropriately
- [ ] RLS policies enabled on all user-data tables
- [ ] Google provider configured with production credentials

**Backend**
- [ ] All `.env` values set (not defaults or empty)
- [ ] `NODE_ENV=production` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in any client bundle (verify with `grep -r "SERVICE_ROLE" ./src`)
- [ ] Rate limiting middleware active on auth routes
- [ ] CORS configured for production origins only
- [ ] HTTPS enforced (no HTTP in production)
- [ ] Auth routes confirmed public (no middleware)
- [ ] Security headers (helmet) active

**Frontend**
- [ ] All `EXPO_PUBLIC_*` env vars set for production
- [ ] Deep link scheme registered in `app.config.js`
- [ ] Google Sign-In configured with production client IDs
- [ ] Android SHA-1 fingerprint from production keystore (not debug)
- [ ] `console.log` statements removed (especially any logging tokens)
- [ ] Axios interceptor tested: only attaches token `if (token)` 
- [ ] Error messages are user-friendly (not raw Supabase/API errors)

**Google Cloud Console**
- [ ] OAuth consent screen published (not "Testing" mode for production)
- [ ] Production redirect URIs added
- [ ] Android production SHA-1 added
- [ ] App verified (if required by Google for OAuth)

**Email Deliverability**
- [ ] SPF record published
- [ ] DKIM record published
- [ ] DMARC record published
- [ ] Sender domain verified in Brevo
- [ ] Spam score < 3 (test at mail-tester.com)

---

## 18. Common Bugs & Fixes

| Bug | Cause | Fix |
|---|---|---|
| `"No bearer token provided"` on signup | Auth middleware on public route | Move signup outside `authMiddleware` |
| `"No bearer token provided"` on any call | Axios attaches `Bearer null` | Add `if (token)` guard in interceptor |
| Confirmation email not arriving | Brevo SMTP not configured in Supabase | Set up custom SMTP in Project Settings → Auth → SMTP |
| Confirmation email not arriving | Sender email not verified in Brevo | Verify sender domain/email in Brevo |
| `"Email not confirmed"` on login right after signup | Expected — user hasn't clicked link | Show `VerifyEmailScreen`, offer resend |
| Google sign-in returns no `idToken` | Wrong client ID in GoogleSignin.configure | Use `webClientId` (web client ID from GCP), not iOS/Android ID |
| Deep link not opening app | `scheme` missing in `app.config.js` | Add `scheme: "upcheck"` to Expo config |
| Deep link opens but tokens not parsed | Hash fragment vs query param | Parse both `?` and `#` from URL (Supabase uses both) |
| `"Invalid API key"` from Supabase | `SUPABASE_ANON_KEY` env var missing/wrong | Check `.env` file, restart server |
| Refresh loop on 401 | Refresh endpoint also returning 401 | Add `_isRetried` flag, skip refresh for `/auth/` routes |
| `"User not found"` after Google OAuth | User created in Supabase but not synced to your DB | Add webhook or trigger: `auth.users` INSERT → create user in your `public.users` table |
| Android Google sign-in fails | Wrong/missing SHA-1 fingerprint | Run `eas credentials` and add SHA-1 to Google Cloud Console Android client |
| iOS Google sign-in fails | Reverse client ID URL scheme not registered | Add `CFBundleURLSchemes` to `app.config.js` `ios.infoPlist` |
| CORS error on OAuth callback | Backend CORS not allowing the redirect origin | Add Supabase URL and mobile scheme to CORS allowed origins |
| Session not persisting after app kill | `expo-secure-store` not configured as Supabase storage | Pass `ExpoSecureStoreAdapter` to `createClient` storage option |
| Token refresh race condition | Multiple 401 errors triggering multiple refresh calls | Implement the `isRefreshing` + `refreshSubscribers` queue pattern |

---

*End of Authentication Blueprint*
*Upcheck Auth Module v1.0 — Production Ready*
*Stack: React Native (Expo) · Supabase Auth · Brevo SMTP · Google OAuth*