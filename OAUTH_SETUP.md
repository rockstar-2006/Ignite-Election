# Google OAuth 2.0 Setup Guide

## Overview
This application uses Google OAuth 2.0 for user authentication. Follow these steps to get it working.

## Prerequisites
- Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

---

## Step 1: Get Your Google Client Secret

1. Go to **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**
2. Select your project (should be "ignite-election" or similar)
3. In the left sidebar, click **Credentials**
4. Find your OAuth 2.0 Client application:
   - Look for "Web application" type
   - Client ID should be: `387321091161-rierni48hg7ktvumm3ftag8khk7u2c04.apps.googleusercontent.com`
5. Click on it to open the details
6. Copy the **Client Secret** value
7. Paste it in `.env.local`:
   ```env
   GOOGLE_CLIENT_SECRET=YOUR_COPIED_SECRET_HERE
   ```

---

## Step 2: Configure Authorized Redirect URIs

1. In the same OAuth 2.0 Client settings page
2. Find **Authorized redirect URIs** section
3. Add these URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. For production (replace with your actual domain):
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
5. Click **Save**

⚠️ **Important:** The redirect URI must match EXACTLY (including https/http and trailing slashes)

---

## Step 3: Verify Environment Variables

Your `.env.local` should have:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ignite-election-super-secret-key-change-this-in-production
GOOGLE_CLIENT_ID=387321091161-rierni48hg7ktvumm3ftag8khk7u2c04.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_SECRET_HERE
```

---

## Step 4: Test the Setup

1. Restart your dev server:
   ```bash
   npm run dev
   ```
2. Go to `http://localhost:3000/auth/signin`
3. Click "Sign in with Google"
4. You should see the Google login dialog

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Error 400: redirect_uri_mismatch` | Redirect URI not registered | Verify the exact URI in Google Cloud Console |
| `Invalid client` | Wrong Client ID/Secret | Double-check credentials in `.env.local` |
| `Environment variable missing` | Missing env var | Ensure all required vars in `.env.local` |
| Blank error screen | Secret not refreshed | Restart dev server with `npm run dev` |

---

## Production Deployment

When deploying to production:

1. Update `NEXTAUTH_URL` to your actual domain:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   ```

2. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

3. Add the production redirect URI in Google Console:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

4. Set all environment variables in your hosting platform (Vercel, Railway, etc.)

---

## Security Notes

- ✅ Never commit `.env.local` to git (add to `.gitignore`)
- ✅ Keep `GOOGLE_CLIENT_SECRET` private
- ✅ Use strong `NEXTAUTH_SECRET` for production
- ✅ Only allowed email domains: `@sode-edu.in` + admin emails
