# Deploy Upcheck Backend on Render

## Prerequisites
- GitHub repo with this backend code
- Render account (Free tier works)
- Supabase project URL and Anon Key
- Brevo API key and approved sender email

## Steps

### 1. Push to GitHub
Ensure this backend is in a GitHub repo.

### 2. Create Render Web Service
1. Go to Render Dashboard → New → Web Service.
2. Connect your GitHub repo.
3. Use the following settings:
   - **Name**: upcheck-backend (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Health Check Path**: `/auth/health`
   - **Instance Type**: Free (or Standard if you prefer)

### 3. Environment Variables
Add these in Render → Service → Environment:
```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
BREVO_API_KEY=your_brevo_api_key
BREVO_EMAIL_SENDER_NAME=Upcheck
BREVO_EMAIL_SENDER_EMAIL=your_verified_sender_email
BREVO_SMS_SENDER=Upcheck
```

### 4. Deploy
- Push changes to GitHub; Render will auto-deploy.
- Monitor the logs; ensure `/auth/health` returns 200.

### 5. Optional: Cron for OTP Cleanup
If you want hourly OTP cleanup:
1. Create a new **Cron Job** in Render.
2. Connect the same repo.
3. Schedule: `0 * * * *` (hourly)
4. Build Command: `npm ci`
5. Start Command: `npm run otp-cleanup`
6. Add the same `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars.

## Post-Deploy
- Note the Render service URL (e.g., `https://upcheck-backend.onrender.com`).
- Update your mobile app’s `API_BASE_URL` to this URL.
- Test OTP flows and health check.

## Troubleshooting
- If build fails: check logs; ensure `npm ci` works and `nest build` succeeds.
- If runtime fails: ensure all env vars are set and Supabase/Brevo credentials are valid.
- For OTP cron: ensure ts-node is available; if not, switch to a compiled version.

## Notes
- Free tier services spin down after inactivity; first request may be slow.
- For production, consider using a paid instance and a custom domain.
