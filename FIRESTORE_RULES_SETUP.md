# 🔧 Firestore Security Rules Setup

## Problem
Your app shows: `Missing or insufficient permissions`

This means Firestore is denying read/write access. You need to configure the security rules in Firebase Console.

---

## ✅ Step-by-Step Fix

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ignite-election**
3. In left sidebar, click **Firestore Database**

### Step 2: Navigate to Rules
1. Click the **Rules** tab at the top
2. You should see a code editor with current rules

### Step 3: Replace Rules with This Configuration

Copy and paste this entire rule set:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if the user is an authorized Admin
    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email == "bhushan.poojary2006@gmail.com" ||
        request.auth.token.email == "varnothsavasode@gmail.com"
      );
    }

    // --- STUDENT PROFILES & NOMINATIONS ---
    match /users/{email} {
      // Students can manage their own data
      allow read, write: if request.auth != null && request.auth.token.email == email;
      
      // Admins can see everyone's data for the Statistics and Admin panel
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    // --- GLOBAL SECURITY ---
    // Deny everything else unless it's an admin
    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Step 4: Publish the Rules
1. Click **"Publish"** button (blue button at bottom right)
2. Wait for confirmation: "Rules updated successfully"

---

## 🎯 What These Rules Do

| Rule | Purpose |
|------|---------|
| `function isAdmin()` | Helper function to check if user is an authorized admin |
| `match /users/{email}` | Students can read/write their own profile; Admins can read/write all |
| `match /{document=**}` | Only admins can access everything else (default deny for non-admins) |

**Admin Accounts (can access everything):**
- bhushan.poojary2006@gmail.com
- varnothsavasode@gmail.com

**Student Accounts (can only access their own profile):**
- Any account that signs in with Google
- Can only read/write their own `/users/{email}` document

---

## ✨ Testing

After publishing the rules:

1. **Hard refresh** your browser: (Ctrl+Shift+R or Cmd+Shift+R)
2. Try signing in again
3. The profile fetch errors should disappear
4. Dashboard should load successfully

---

## 🆘 Troubleshooting

### Still Getting "Missing or insufficient permissions"?

**Try these steps:**

1. **Hard refresh** browser (Ctrl+Shift+R)
2. **Kill and restart** dev server:
   ```bash
   # Press Ctrl+C in terminal
   # Then:
   npm run dev
   ```
3. **Check your email domain**: Make sure you're signed in with a `@sode-edu.in` email
4. **Verify rules saved**: Go back to Firestore Rules tab, rules should match above

### Rules Published but Still Not Working?

- Rules can take **5-10 seconds** to propagate globally
- **Wait 30 seconds** before testing
- Try signing out and back in
- Check browser console (F12) for exact error message

### Firestore Rules Syntax Error?

If you see a red error notification:
- Check for typos in the rules
- Make sure you're pasting the ENTIRE rule set above
- Try clearing and re-typing instead of copy-pasting

---

## 📋 Security Best Practices Explained

### Why `request.auth.token.email == email`?
- Ensures users can ONLY access their own documents
- Prevents one user from reading another user's profile
- Matches the document ID (email) with authenticated user's email

### Why have both `read` and `list`?
- `read`: Gets a specific document (e.g., /users/john@sode-edu.in)
- `list`: Gets all documents in the collection
- Usually need both for app to function properly

### Why deny admin collection?
- Only admins (@sode-edu.in) should access admin data
- This prevents unprivileged users from accessing sensitive info

---

## 🔗 Next Steps

If rules are set correctly but still having issues:
1. Check that `GOOGLE_CLIENT_SECRET` is correct in `.env.local`
2. Make sure you're signed in with correct email (@sode-edu.in or admin list)
3. Try creating a new test Firestore document manually in Firebase Console

For more info: [Firebase Security Rules Docs](https://firebase.google.com/docs/firestore/security/start)
