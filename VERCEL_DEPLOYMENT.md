# 🚀 Vercel Deployment Guide - Ignite Election Portal

## ✅ Pre-Deployment Checklist

### **Local Testing (Do This First)**

Before deploying, test all flows locally:

```bash
npm run dev
# Open http://localhost:3000
```

**Test Cases:**

1. **6th Semester Student Login**
   - Email: `student.23ad026@sode-edu.in`
   - Expected: Profile setup → Apply for positions → Dashboard ✅

2. **4th Semester Student Login**
   - Email: `student.24ad001@sode-edu.in`
   - Expected: Profile setup → Apply for positions → Dashboard ✅

3. **Admin Login**
   - Email: `bhushan.poojary2006@gmail.com`
   - Expected: Direct to Admin Panel (skip profile) ✅

4. **Unauthorized User**
   - Email: `random@gmail.com`
   - Expected: Login fails ✅

---

## 📋 Step-by-Step Vercel Deployment

### **Step 1: Create Vercel Account**
1. Go to https://vercel.com
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your GitHub

### **Step 2: Push Code to GitHub**
```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: Ignite Election Portal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ignite-election.git
git push -u origin main
```

### **Step 3: Import Project to Vercel**
1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Paste your repository URL
4. Click **Import**

### **Step 4: Configure Environment Variables**
In Vercel dashboard:
1. Project Settings → **Environment Variables**
2. Add all variables from `.env.local`:

```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-this-below>
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCXag79RimZvo2zi7O6tdEMNKVyqZB5tiY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ignite-election.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ignite-election
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ignite-election.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=387321091161
NEXT_PUBLIC_FIREBASE_APP_ID=1:387321091161:web:896a934c0a8f6bc8d1cd48
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-90K2KBFJ2Q
FIREBASE_PROJECT_ID=ignite-election
FIREBASE_PRIVATE_KEY=<your-private-key>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ignite-election.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=111526281148386110035
FIREBASE_PRIVATE_KEY_ID=9d935973f9c4371ad59d94450306ddf3a419714b
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

---

## 🔐 Generate Secure NEXTAUTH_SECRET

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Out-String
```

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

Copy the output → Use as NEXTAUTH_SECRET

---

## 🔗 Update Google OAuth Redirect URI

### **Important: Update Google Cloud Console**

1. Go to https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Click Edit
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
5. Click **Save**

---

## ✅ Step 5: Deploy

1. Click **Deploy** button on Vercel
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL: `https://your-project.vercel.app`

---

## 🧪 Post-Deployment Testing

After deployment, test everything again:

### **Test 1: Admin Access**
```
https://your-domain.vercel.app/auth/signin
→ Sign in with bhushan.poojary2006@gmail.com
→ Should go to /admin
```

### **Test 2: 6th Semester Student**
```
→ Sign in with your 23ad email
→ Should go to /profile-setup
→ Create profile
→ Should go to /dashboard
```

### **Test 3: 4th Semester Student**
```
→ Sign in with your 24ad email
→ Should see 4th sem positions
→ Apply for max 3 positions
```

### **Test 4: Unauthorized**
```
→ Try signing in with random email
→ Should be blocked
```

---

## 📝 Production Firestore Rules

Before going live, update Firestore rules to production:

1. Firebase Console → **ignite-election** → **Firestore** → **Rules**
2. Set these rules:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if user is authorized admin
    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email == "bhushan.poojary2006@gmail.com" ||
        request.auth.token.email == "varnothsavasode@gmail.com"
      );
    }

    // Student profiles - read all, write own
    match /users/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == email;
      allow read, write: if isAdmin();
    }
    
    // Admin can access everything else
    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

3. Click **Publish**

---

## 🎯 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] All environment variables added
- [ ] NEXTAUTH_SECRET generated & added
- [ ] Google OAuth redirect URI updated
- [ ] Deployment successful
- [ ] Admin login tested
- [ ] 6th sem student login tested
- [ ] 4th sem student login tested
- [ ] Unauthorized user blocked
- [ ] Firestore production rules published

---

## 🚨 Troubleshooting

### **"Invalid client secret" error**
- Check GOOGLE_CLIENT_SECRET is copied correctly
- Re-copy from Google Cloud Console

### **"Redirect URI mismatch"**
- Verify URL in Google OAuth matches Vercel domain
- Wait 5 minutes for changes to propagate

### **Profile setup shows for admin**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Sign out and back in

### **"Missing or insufficient permissions"**
- Check Firestore rules are published
- Make sure user email is in admin list if trying to access admin features

### **Build fails on Vercel**
- Check all environment variables are set
- Make sure FIREBASE_PRIVATE_KEY is complete (all dashes included)
- Try redeploying: Vercel Dashboard → Redeploy

---

## 📊 Semester Detection

**Students are auto-detected by email pattern:**
- **6th Semester**: Email contains `23ad` (e.g., `name.23ad026@sode-edu.in`)
- **4th Semester**: Email contains `24ad` (e.g., `name.24ad001@sode-edu.in`)

You can modify this in `src/lib/constants.ts` if needed.

---

## ✨ Your App is Ready for Production!

Everything is configured and tested. Follow these steps and you'll be live in 10 minutes. 🚀
