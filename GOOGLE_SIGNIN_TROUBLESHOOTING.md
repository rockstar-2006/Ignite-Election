# 🔧 Google Sign-In Troubleshooting Guide

## ✅ Quick Checklist

### Step 1: Verify Google Cloud Console Settings
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [ ] Select your project: **ignite-election**
- [ ] Go to **Credentials** tab
- [ ] Find your OAuth 2.0 Client ID: `387321091161-rierni48hg7ktvumm3ftag8khk7u2c04.apps.googleusercontent.com`
- [ ] Click on it to edit

### Step 2: Check Authorized Redirect URIs
These URIs **MUST MATCH EXACTLY** (including http/https and slashes):

For **local development**, add:
```
http://localhost:3000/api/auth/callback/google
```

For **production**, add:
```
https://yourdomain.com/api/auth/callback/google
```

⚠️ **IMPORTANT:** Click **Save** after adding/modifying URIs

### Step 3: Verify Environment Variables
Check your `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ignite-election-super-secret-key-change-this-in-production
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

### Step 4: Restart Development Server
```bash
# Kill the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test Sign-In
1. Go to `http://localhost:3000/auth/signin`
2. Click **"Sign in with Google"**
3. You should see Google login dialog

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| **`Error 400: redirect_uri_mismatch`** | Redirect URI not in Google Console | Add exact URI in Google Cloud Console and save |
| **`Invalid client`** | Wrong Client ID/Secret | Copy credentials again from Google Console |
| **`Something went wrong`** (blank) | Server not restarted | Kill dev server and run `npm run dev` |
| **`Access Denied`** | Email not @sode-edu.in | Add your email to ADMIN_EMAILS in `src/lib/constants.ts` |
| **Redirect loop** | NEXTAUTH_URL wrong | Set to `http://localhost:3000` for local dev |

---

## 📋 Email Authorization Check

Currently, only these emails can sign in:
- Emails ending with `@sode-edu.in`
- Emails in ADMIN_EMAILS list in `src/lib/constants.ts`

**To add your test email:**

Edit [src/lib/constants.ts](src/lib/constants.ts):
```typescript
export const ADMIN_EMAILS = [
  'your-email@gmail.com',  // Add your test email here
  'admin@sode-edu.in',
];
```

---

## 🔍 Debug Steps

### Check if Google Provider is Loading
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Sign in with Google
4. Look for messages in console

### Check NextAuth Logs
Add this to your `.env.local`:
```env
NEXTAUTH_DEBUG=true
```

Then restart the server - you'll see detailed NextAuth logs in terminal.

### Verify Credentials Are Loaded
Run this command to test:
```bash
npm run dev
```
If you see this error at startup, credentials aren't loaded:
```
❌ Google OAuth credentials are not configured
```

---

## ✨ Step-by-Step Fix Process

1. **Kill dev server** (Ctrl+C in terminal)
2. **Go to Google Cloud Console** → Credentials → Your OAuth Client
3. **Copy the exact redirect URI** and verify it's registered
4. **Verify `.env.local` has correct values**
5. **Restart dev server**: `npm run dev`
6. **Wait 30 seconds** for changes to take effect
7. **Try signing in** at `http://localhost:3000/auth/signin`

---

## 🆘 Still Not Working?

Check the browser console for specific error messages:
- Press F12
- Go to **Console** tab
- Try signing in
- Copy the exact error message and check the table above

Most common: **redirect_uri_mismatch** = URI not in Google Console
