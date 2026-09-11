import { adminDb } from '../firebase-admin';

export interface AdminCredentials {
  email: string;
  passwordHash: string;
  updatedAt: string;
}

const DEFAULT_ADMIN_EMAIL = 'admin@sode-edu.in';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity timeout

/**
 * Retrieve admin credentials from Firestore or initialize with defaults
 */
export async function getAdminCredentials(): Promise<{ email: string; password: string }> {
  try {
    const docRef = adminDb.collection('admin_auth').doc('credentials');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const defaultCreds = {
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        updatedAt: new Date().toISOString(),
      };
      await docRef.set(defaultCreds);
      return { email: defaultCreds.email, password: defaultCreds.password };
    }

    const data = docSnap.data();
    let currentEmail = data?.email || DEFAULT_ADMIN_EMAIL;
    let currentPassword = data?.password || DEFAULT_ADMIN_PASSWORD;

    // Auto-migrate legacy ignite email to official sode-edu.in email
    if (currentEmail === 'admin@ignite.com') {
      currentEmail = DEFAULT_ADMIN_EMAIL;
      await docRef.set({
        email: currentEmail,
        password: currentPassword,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return {
      email: currentEmail,
      password: currentPassword,
    };
  } catch (error) {
    console.error('Error fetching admin credentials:', error);
    return { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };
  }
}

/**
 * Check if another admin session is currently active
 */
export async function getActiveAdminSession(): Promise<{
  isActive: boolean;
  activeSessionId?: string;
  activeEmail?: string;
  lastActiveAt?: number;
  remainingSeconds?: number;
}> {
  try {
    const sessionDoc = await adminDb.collection('admin_auth').doc('session').get();
    if (!sessionDoc.exists) {
      return { isActive: false };
    }

    const data = sessionDoc.data();
    if (!data?.activeSessionId) {
      return { isActive: false };
    }

    const now = Date.now();
    const elapsed = now - (data.lastActiveAt || 0);

    if (elapsed < SESSION_TIMEOUT_MS) {
      const remainingSeconds = Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000);
      return {
        isActive: true,
        activeSessionId: data.activeSessionId,
        activeEmail: data.activeEmail,
        lastActiveAt: data.lastActiveAt,
        remainingSeconds,
      };
    }

    return { isActive: false };
  } catch (error) {
    console.error('Error checking active admin session:', error);
    return { isActive: false };
  }
}

/**
 * Verify admin login with email, password, and enforce single-session lock
 */
export async function verifyAdminLogin(
  email: string,
  password: string,
  newSessionId: string
): Promise<{ isValid: boolean; error?: string; inUse?: boolean; remainingSeconds?: number }> {
  const cleanEmail = email.toLowerCase().trim();
  const creds = await getAdminCredentials();

  if (cleanEmail !== creds.email.toLowerCase().trim()) {
    return { isValid: false, error: 'Invalid admin email address.' };
  }

  if (password !== creds.password) {
    return { isValid: false, error: 'Incorrect admin password.' };
  }

  // Check single-session lock
  const activeSession = await getActiveAdminSession();
  if (activeSession.isActive && activeSession.activeSessionId !== newSessionId) {
    return {
      isValid: false,
      error: 'The Admin Portal is currently in use by someone else. Only one person can be logged in at a time.',
      inUse: true,
      remainingSeconds: activeSession.remainingSeconds,
    };
  }

  // Lock session for this user
  await adminDb.collection('admin_auth').doc('session').set({
    activeSessionId: newSessionId,
    activeEmail: cleanEmail,
    lastActiveAt: Date.now(),
    loggedInAt: new Date().toISOString(),
  });

  return { isValid: true };
}

/**
 * Touch / Keep-Alive heartbeat for the active session
 */
export async function touchAdminSession(sessionId: string): Promise<boolean> {
  try {
    const sessionDoc = await adminDb.collection('admin_auth').doc('session').get();
    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      if (data?.activeSessionId === sessionId) {
        await adminDb.collection('admin_auth').doc('session').update({
          lastActiveAt: Date.now(),
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error touching admin session:', error);
    return false;
  }
}

/**
 * Release active session upon logout or explicit force release
 */
export async function releaseAdminSession(sessionId?: string, force: boolean = false): Promise<void> {
  try {
    const sessionRef = adminDb.collection('admin_auth').doc('session');
    if (force) {
      await sessionRef.set({
        activeSessionId: null,
        activeEmail: null,
        lastActiveAt: 0,
      });
      return;
    }

    const snap = await sessionRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (!sessionId || data?.activeSessionId === sessionId) {
        await sessionRef.set({
          activeSessionId: null,
          activeEmail: null,
          lastActiveAt: 0,
        });
      }
    }
  } catch (error) {
    console.error('Error releasing admin session:', error);
  }
}

/**
 * Update admin password in Firestore
 */
export async function updateAdminPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const creds = await getAdminCredentials();

  if (cleanEmail !== creds.email.toLowerCase().trim()) {
    throw new Error('Admin email does not match.');
  }

  if (currentPassword !== creds.password) {
    throw new Error('Current password is incorrect.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const now = new Date();
  const docRef = adminDb.collection('admin_auth').doc('credentials');
  await docRef.set(
    {
      email: cleanEmail,
      password: newPassword,
      updatedAt: now.toISOString(),
      updatedAtFormatted: now.toLocaleString('en-IN'),
    },
    { merge: true }
  );

  return {
    success: true,
    message: 'Admin password updated successfully! You can now use your new password.',
  };
}

/**
 * Update admin credentials (email and/or password) in Firestore
 */
export async function updateAdminCredentials(
  currentEmail: string,
  currentPassword: string,
  newEmail?: string,
  newPassword?: string
): Promise<{ success: boolean; message: string; updatedEmail: string }> {
  const cleanEmail = currentEmail.toLowerCase().trim();
  const creds = await getAdminCredentials();

  if (cleanEmail !== creds.email.toLowerCase().trim()) {
    throw new Error('Current admin email does not match.');
  }

  if (currentPassword !== creds.password) {
    throw new Error('Current password is incorrect.');
  }

  const finalEmail = newEmail ? newEmail.toLowerCase().trim() : cleanEmail;
  const finalPassword = newPassword && newPassword.trim().length >= 6 ? newPassword.trim() : creds.password;

  if (newPassword && newPassword.trim().length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const now = new Date();
  const docRef = adminDb.collection('admin_auth').doc('credentials');
  await docRef.set(
    {
      email: finalEmail,
      password: finalPassword,
      updatedAt: now.toISOString(),
      updatedAtFormatted: now.toLocaleString('en-IN'),
    },
    { merge: true }
  );

  return {
    success: true,
    message: 'Admin credentials updated successfully! Please save your new login credentials.',
    updatedEmail: finalEmail,
  };
}
