# Authentication Module

This project implements a complete authentication system using NestJS (Backend) and React Native (Frontend) with Supabase as the database and Brevo for transactional emails.

## Features

- **Email/Password Registration & Login**: Secure password hashing with bcrypt.
- **Google OAuth**: Integrated with Google Sign-In for mobile and web.
- **Email Verification**: Sends verification emails upon registration.
- **Password Reset**: Allows users to reset forgotten passwords via email.
- **Session Management**: JWT-based authentication with Access and Refresh tokens.
- **Profile Management**: View and update user profile.

## Backend Setup

1.  **Environment Variables**: Ensure `.env` contains:
    ```env
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    JWT_SECRET=...
    BREVO_API_KEY=...
    BREVO_EMAIL_SENDER_NAME=...
    BREVO_EMAIL_SENDER_EMAIL=...
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    FRONTEND_URL=...
    ```

2.  **Database**: Run `backend/database/schema.sql` in your Supabase SQL editor to set up tables.

## Frontend Setup

1.  **Dependencies**: `npm install` in `frontend` directory.
2.  **Environment Variables**: Ensure `.env` (or Expo secrets) contains:
    ```env
    EXPO_PUBLIC_ANDROID_CLIENT_ID=...
    EXPO_PUBLIC_IOS_CLIENT_ID=...
    EXPO_PUBLIC_WEB_CLIENT_ID=...
    ```

## Authentication Flow

1.  **Registration**:
    - User signs up -> Backend creates user in Supabase -> Sends verification email (if enabled).
    - If Google OAuth -> User authenticated via Google -> Backend creates/updates user -> Returns JWTs.

2.  **Login**:
    - User logs in -> Backend verifies credentials -> Returns Access (short-lived) and Refresh (long-lived) tokens.
    - Frontend stores tokens in `AsyncStorage`.

3.  **Token Refresh**:
    - Axios interceptor detects 401 errors.
    - Uses Refresh Token to get new Access Token.
    - If Refresh Token fails, logs user out.

## Key Files

- **Backend**:
    - `auth.service.ts`: Core logic.
    - `jwt.strategy.ts`: Validates Access Tokens.
    - `email.service.ts`: Handles email sending.

- **Frontend**:
    - `AuthContext.tsx`: Manages auth state and provides `login`, `register`, `logout` methods.
    - `api.ts`: Axios instance with interceptors.
    - `screens/auth/`: Login, Register, ForgotPassword screens.
