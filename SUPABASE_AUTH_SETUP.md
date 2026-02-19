# Supabase Authentication Setup Guide

Complete guide to set up Supabase authentication for the Upcheck app with OAuth (Google) and email/password authentication.

---

## 🎯 Overview

This app uses **Supabase Auth** for all authentication:
- ✅ Email/Password authentication
- ✅ Google OAuth with deep linking
- ✅ Password reset via email
- ✅ Email verification
- ✅ Automatic session management

---

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Google Cloud Project**: For OAuth (see Google OAuth setup below)

---

## 🔧 Step 1: Supabase Project Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in project details:
   - **Project Name**: `upcheck-app` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development

### 1.2 Get Supabase Credentials

Once your project is created:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this SECRET!)

---

## 🔑 Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google+ API** for your project

### 2.2 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in:
   - **App name**: Upcheck
   - **User support email**: your email
   - **Developer contact**: your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. Save and continue

### 2.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Create **THREE** OAuth clients:

#### Web Application (for Supabase)
- **Application type**: Web application
- **Name**: Upcheck Web
- **Authorized redirect URIs**: Add:
  ```
  https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
  ```
  Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference
  (e.g., `https://abcdefghijk.supabase.co/auth/v1/callback`)

- Save and copy the **Client ID** (this is your web client ID)

#### iOS Application (optional, for native iOS)
- **Application type**: iOS
- **Name**: Upcheck iOS
- **Bundle ID**: `com.upcheck.app`

#### Android Application (optional, for native Android)
- **Application type**: Android
- **Name**: Upcheck Android
- **Package name**: `com.upcheck.app`
- **SHA-1 certificate**: Get from your keystore

---

## ⚙️ Step 3: Configure Supabase Auth Providers

### 3.1 Enable Google Provider in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** and click to configure
3. Enable Google provider
4. Fill in:
   - **Client ID (for OAuth)**: Your **Web Application** Client ID from Google Cloud
   - **Client Secret (for OAuth)**: Your **Web Application** Client Secret
5. Save

### 3.2 Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add these **Redirect URLs**:
   ```
   upcheckapp://auth
   upcheckapp://reset-password
   http://localhost:8081
   exp://localhost:19000/--/auth (for Expo dev)
   ```

---

## 📝 Step 4: Backend Environment Variables

Create/update `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Frontend URL (for password reset emails)
FRONTEND_URL=upcheckapp://

# Google OAuth Client IDs (for reference - not used with Supabase Auth)
GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com

# Other existing configs...
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://...
```

**⚠️ Important**: The `SUPABASE_SERVICE_ROLE_KEY` is **extremely sensitive** - it bypasses Row Level Security. Never commit it to Git or expose it to the frontend!

---

## 📱 Step 5: Frontend Configuration

Update `frontend/app.json` → `extra`:

```json
{
  "extra": {
    "supabaseUrl": "https://YOUR_PROJECT_REF.supabase.co",
    "supabaseAnonKey": "your_anon_key_here",
    "googleClientIdWeb": "your-web-client-id.apps.googleusercontent.com",
    "apiBaseUrl": "http://localhost:8080"
  }
}
```

**Note**: The `supabaseAnonKey` is safe to expose in the frontend - it's designed for client-side use.

---

## 🔐 Step 6: Update App to Use Supabase Auth

### 6.1 Replace AuthContext

In your `App.tsx` or root component:

```tsx
// OLD:
import { AuthProvider } from './src/context/AuthContext';

// NEW:
import { SupabaseAuthProvider } from './src/context/SupabaseAuthContext';

// In your component:
<SupabaseAuthProvider>
  {/* Your app */}
</SupabaseAuthProvider>
```

### 6.2 Update Login Screen

```tsx
import { useSupabaseAuth } from '../context/SupabaseAuthContext';

const LoginScreen = () => {
  const { signIn, signInWithGoogle } = useSupabaseAuth();

  const handleEmailLogin = async () => {
    try {
      await signIn(email, password);
      // Navigate to home
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // OAuth will redirect back via deep link
    } catch (error) {
      console.error(error);
    }
  };

  // ... rest of component
};
```

### 6.3 Update Register Screen

```tsx
import { useSupabaseAuth } from '../context/SupabaseAuthContext';

const RegisterScreen = () => {
  const { signUp } = useSupabaseAuth();

  const handleRegister = async () => {
    try {
      await signUp(email, password, {
        firstName,
        lastName,
        username,
      });
      // Navigate or show success
    } catch (error) {
      console.error(error);
    }
  };

  // ... rest of component
};
```

---

## 🧪 Step 7: Testing

### Test Email/Password Auth

1. **Registration**:
   ```bash
   POST http://localhost:8080/api/auth/supabase/signup
   Body: {
     "email": "test@example.com",
     "password": "SecurePass123!",
     "firstName": "Test",
     "lastName": "User"
   }
   ```

2. **Login**:
   ```bash
   POST http://localhost:8080/api/auth/supabase/signin
   Body: {
     "email": "test@example.com",
     "password": "SecurePass123!"
   }
   ```

### Test Google OAuth

1. Click "Sign in with Google" in your app
2. Browser opens with Google OAuth consent screen
3. After approval, redirects to `upcheckapp://auth?access_token=...`
4. App automatically handles the redirect and logs you in

### Verify in Supabase Dashboard

1. Go to **Authentication** → **Users**
2. You should see your test users listed
3. Check their metadata, providers, etc.

---

## 🔒 Step 8: Email Templates (Optional)

Customize email templates in Supabase:

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - **Confirm Signup**: Email verification
   - **Reset Password**: Password reset
   - **Magic Link**: Passwordless login (if you want)

---

## 🚀 Step 9: Production Deployment

### Backend (Render/Heroku/etc.)

Set environment variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=upcheckapp://
```

### Frontend (Expo/App Stores)

1. **Build app** with correct bundle identifiers:
   - iOS: `com.upcheck.app`
   - Android: `com.upcheck.app`

2. **Configure deep linking** in app stores to handle `upcheckapp://` scheme

3. **Update Google OAuth** allowed redirect URIs to include production URLs

---

## 🆚 Supabase Auth vs Custom Auth

### Why Supabase Auth?

✅ **Built-in OAuth** - Google, Apple, GitHub, etc.
✅ **Email verification** - Automatic, customizable
✅ **Password reset** - Secure, out of the box
✅ **Session management** - Auto-refresh, secure storage
✅ **JWT tokens** - Standard, secure
✅ **Row Level Security** - Database-level auth
✅ **Audit logs** - Track auth events
✅ **Less code** - No need to implement custom auth

### Migrating from Custom Auth

If you have existing users, you can:
1. Keep old auth endpoints for backward compatibility
2. Gradually migrate users to Supabase
3. Use Supabase Admin API to bulk import users
4. Implement a "link account" flow

---

## 📚 API Endpoints

All endpoints are prefixed with `/api/auth/supabase`:

### Public Endpoints
- `POST /signup` - Register new user
- `POST /signin` - Email/password login
- `POST /oauth/google` - Google OAuth (ID token)
- `POST /refresh` - Refresh access token
- `POST /forgot-password` - Send password reset email
- `POST /resend-verification` - Resend verification email

### Protected Endpoints (require Bearer token)
- `GET /me` - Get current user
- `POST /update` - Update user info
- `POST /update-password` - Change password
- `POST /signout` - Sign out (revoke session)

---

## 🐛 Troubleshooting

### "Invalid client" error with Google OAuth
- Verify your Web Client ID is correct in Supabase
- Check authorized redirect URIs in Google Cloud Console
- Make sure you're using the **Web** client ID, not iOS/Android

### Deep linking not working
- Test deep link: `npx uri-scheme open upcheckapp://auth --android` or `--ios`
- Verify `scheme` is set in `app.json`
- Check `intentFilters` for Android
- Rebuild app after changing `app.json`

### "Session not found" errors
- Check Supabase URL and Anon Key are correct
- Verify AsyncStorage is working
- Clear app data and try again

### Email verification not working
- Check Supabase email templates
- Verify SMTP settings in Supabase (or use default)
- Check spam folder

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Expo Linking**: https://docs.expo.dev/guides/linking/
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2

---

## ✅ Quick Checklist

Before going live:

- [ ] Supabase project created
- [ ] Environment variables set (backend + frontend)
- [ ] Google OAuth configured in Google Cloud
- [ ] Google provider enabled in Supabase
- [ ] Redirect URLs configured
- [ ] Deep linking tested
- [ ] Email templates customized
- [ ] Row Level Security policies set up (if using Supabase database)
- [ ] Production URLs added to allowed redirects
- [ ] App bundle IDs match OAuth configuration

---

**You're all set! 🎉** Your app now has production-ready authentication powered by Supabase.
