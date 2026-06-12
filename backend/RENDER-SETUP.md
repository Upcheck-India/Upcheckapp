# Render Deployment Guide

## Critical Issue: Database Connection Failed

The error `ECONNREFUSED localhost:5432` indicates that the `DATABASE_URL` environment variable is **not set** in Render. This is the most important configuration that must be set manually in the Render Dashboard.

## Step-by-Step Setup

### 1. Go to Render Dashboard

Navigate to: https://dashboard.render.com

Select your service: `upcheck-backend`

### 2. Set Environment Variables

Go to: **Environment** tab → **Add Environment Variable**

You MUST set these variables (they have `sync: false` in render.yaml, meaning they're not auto-synced):

#### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | **MOST IMPORTANT!** Supabase PostgreSQL connection string | `postgresql://postgres.hporygudvkfoegxzsivt:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | Supabase project URL | `https://hporygudvkfoegxzsivt.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | Same as `JWT_SECRET` |
| `JWT_SECRET` | JWT signing secret | Any secure random string |

#### Optional Variables

| Variable | Description |
|----------|-------------|
| `JWT_PRIVATE_KEY` | RS256 private key (if using RS256) |
| `JWT_PUBLIC_KEY` | RS256 public key (if using RS256) |
| `REDIS_URL` | Redis connection URL (app falls back to in-memory if not set) |
| `BREVO_API_KEY` | Brevo email API key |
| `TRUECALLER_CLIENT_ID` | Truecaller SDK client ID |

### 3. DATABASE_URL Format

**IMPORTANT: Use the Supabase Pooler URL (port 6543)** for better performance:

```
postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres
```

Example:
```
postgresql://postgres.hporygudvkfoegxzsivt:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**DO NOT use port 5432** - that's the direct connection which has limits on Supabase free tier.

### 4. Google OAuth Configuration

The Google OAuth Client IDs must match between:
1. Frontend (`frontend/.env` → `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`)
2. Backend (`backend/.env` → `GOOGLE_CLIENT_ID_*`)
3. Supabase Dashboard (Authentication → Providers → Google)

**Current Client IDs (must be used everywhere):**
- Web: `557249592391-104epoeebi8ji9bkeacme4kt6urj4ef7.apps.googleusercontent.com`
- iOS: `557249592391-smcje08fcv71hh1vjhmshhvnklpmd7lo.apps.googleusercontent.com`
- Android: `557249592391-omumak2q0qnor86nj47m93ln4fsn8uv3.apps.googleusercontent.com`

### 5. After Setting Variables

Click **Save Changes** - Render will automatically redeploy with the new environment variables.

## Cold Start Behavior

Render's free tier spins down services after ~15 minutes of inactivity. When a request comes in:

1. Render starts the service (cold start ~10-30 seconds)
2. The app connects to the database
3. Health check endpoint `/api/liveness` responds
4. Service becomes "healthy" and starts serving requests

The health endpoints implemented:
- `/api/liveness` - Simple check (no database dependency, quick response)
- `/api/health` - Comprehensive check (database + memory)

## Troubleshooting

### Database Connection Errors

If you see `ECONNREFUSED`:
1. Check `DATABASE_URL` is set in Render Dashboard
2. Verify the URL format is correct
3. Ensure password is URL-encoded (special characters like `@` become `%40`)

### Google OAuth "client deleted" Error

If users see "client deleted" when signing in with Google:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Verify the Web Client ID (`557249592391-104epoeebi8ji9bkeacme4kt6urj4ef7...`) is active
3. Check authorized JavaScript origins include your domains
4. Configure the same Client ID in Supabase Dashboard → Authentication → Providers → Google

### Health Check Failures

If health check fails during cold start:
1. The `/api/liveness` endpoint should respond within 30 seconds
2. Check Render logs for startup errors
3. Verify all required environment variables are set