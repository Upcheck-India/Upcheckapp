# Deployment Guide for Render

This document outlines the steps to deploy the Upcheck backend application to Render.

## Prerequisites

1.  **Render Account**: You must have an active Render account.
2.  **Connected Repository**: Your GitHub/GitLab repository containing this backend code must be connected to Render.
3.  **PostgreSQL Database**: You need a managed PostgreSQL database (Render provides this).

## Environment Variables

Ensure the following environment variables are set in your Render service dashboard under **Environment**:

| Variable Key | Description | Example Value |
| :--- | :--- | :--- |
| `DB_TYPE` | Database Type | `postgres` |
| `DATABASE_URL` | Connection string for your PostgreSQL DB | `postgres://user:pass@host/dbname` |
| `JWT_SECRET` | Secret key for signing JWTs | `your-secure-random-secret-key` |
| `JWT_EXPIRATION` | Token expiration time | `7d` |
| `SMTP_HOST` | SMTP Server Host | `smtp-relay.brevo.com` |
| `SMTP_PORT` | SMTP Server Port | `587` |
| `SMTP_SECURE` | Use SSL/TLS | `false` |
| `SMTP_USER` | SMTP Username | `your-smtp-username` |
| `SMTP_PASS` | SMTP Password | `your-smtp-password` |
| `SMTP_SENDER_NAME` | Sender Name for Emails | `Upcheck` |
| `SMTP_SENDER_EMAIL` | Sender Email Address | `noreply@upcheck.in` |
| `CORS_ORIGIN` | Allowed Origins for CORS | `*` (or specific frontend URLs) |

## Deployment Steps

1.  **Push Changes**: Commit and push your latest code changes to the `main` (or `master`) branch of your repository.
    ```bash
    git add .
    git commit -m "feat: updated auth module and fixed tests"
    git push origin main
    ```

2.  **Automatic Deploy**: If you have "Auto-Deploy" enabled on Render, the build will start automatically upon pushing.

3.  **Manual Deploy**:
    *   Go to your Render Dashboard.
    *   Select your Backend Web Service.
    *   Click **Manual Deploy** > **Deploy latest commit**.

4.  **Verify Deployment**:
    *   Check the **Logs** tab in Render to ensure the build and start commands execute successfully.
    *   Look for "Nest application successfully started".

## Troubleshooting

*   **Database Connection**: If you see connection errors, double-check your `DATABASE_URL` and ensure you have disabled "SSL reject unauthorized" if required (the code handles `ssl: { rejectUnauthorized: false }` for production).
*   **Build Failures**: Check the build logs. Ensure `npm install` and `npm run build` succeed.
