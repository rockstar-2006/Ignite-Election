import { adminDb } from '../firebase-admin';

export interface AdminCredentials {
  email: string;
  passwordHash: string;
  updatedAt: string;
}

export interface AdminAccount {
  email: string;
  password: string;
  role?: string;
  updatedAt?: string;
}

// Built-in Authorized Administrator Accounts
export const DEFAULT_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: 'admin@sode-edu.in',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'Chief Election Commissioner',
  },
  {
    email: 'admin2@sode-edu.in',
    password: process.env.ADMIN2_PASSWORD || 'IgniteAdmin@2026',
    role: 'Deputy Election Commissioner',
  },
];

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity timeout
export const MAX_CONCURRENT_ADMIN_SESSIONS = 2; // Increased size to 2 at a time

export interface ActiveAdminSessionItem {
  sessionId: string;
  email: string;
  lastActiveAt: number;
  loggedInAt: string;
}

/**
 * Retrieve all registered admin credentials from Firestore (or initialize with defaults)
 */
export async function getAllAdminCredentials(): Promise<AdminAccount[]> {
  try {
    const credsDoc = await adminDb.collection('admin_auth').doc('credentials').get();
    let accounts: AdminAccount[] = [...DEFAULT_ADMIN_ACCOUNTS];

    if (credsDoc.exists) {
      const data = credsDoc.data();
      if (Array.isArray(data?.accounts) && data.accounts.length > 0) {
        accounts = data.accounts;
      } else if (data?.email && data?.password) {
        // Migration of single-credential document to accounts array
        const primaryAcc: AdminAccount = {
          email: (data.email || 'admin@sode-edu.in').toLowerCase().trim(),
          password: data.password || 'Admin@123',
          role: 'Chief Election Commissioner',
        };
        const secondaryAcc = DEFAULT_ADMIN_ACCOUNTS[1];
        accounts = [primaryAcc, secondaryAcc];
        
        await adminDb.collection('admin_auth').doc('credentials').set({
          accounts,
          email: primaryAcc.email,
          password: primaryAcc.password,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } else {
      await adminDb.collection('admin_auth').doc('credentials').set({
        accounts,
        email: DEFAULT_ADMIN_ACCOUNTS[0].email,
        password: DEFAULT_ADMIN_ACCOUNTS[0].password,
        updatedAt: new Date().toISOString(),
      });
    }

    // Ensure the 2nd admin account is always present
    const hasAdmin2 = accounts.some(
      (a) => a.email.toLowerCase().trim() === DEFAULT_ADMIN_ACCOUNTS[1].email.toLowerCase().trim()
    );
    if (!hasAdmin2) {
      accounts.push(DEFAULT_ADMIN_ACCOUNTS[1]);
      await adminDb.collection('admin_auth').doc('credentials').set({ accounts }, { merge: true });
    }

    return accounts;
  } catch (error) {
    console.error('Error fetching all admin credentials:', error);
    return DEFAULT_ADMIN_ACCOUNTS;
  }
}

/**
 * Legacy compatibility: Retrieve primary admin credentials
 */
export async function getAdminCredentials(): Promise<{ email: string; password: string }> {
  const accounts = await getAllAdminCredentials();
  return {
    email: accounts[0]?.email || DEFAULT_ADMIN_ACCOUNTS[0].email,
    password: accounts[0]?.password || DEFAULT_ADMIN_ACCOUNTS[0].password,
  };
}

/**
 * Check currently active admin sessions (up to 2 concurrent sessions allowed)
 */
export async function getActiveAdminSession(): Promise<{
  isActive: boolean;
  activeSessionId?: string;
  activeEmail?: string;
  lastActiveAt?: number;
  remainingSeconds?: number;
  activeSessionsCount: number;
  maxSessions: number;
  activeSessions: ActiveAdminSessionItem[];
}> {
  try {
    const sessionDoc = await adminDb.collection('admin_auth').doc('session').get();
    if (!sessionDoc.exists) {
      return { isActive: false, activeSessionsCount: 0, maxSessions: MAX_CONCURRENT_ADMIN_SESSIONS, activeSessions: [] };
    }

    const data = sessionDoc.data();
    const now = Date.now();

    // Support both multi-session array and legacy single-session document
    let rawSessions: ActiveAdminSessionItem[] = [];
    if (Array.isArray(data?.activeSessions)) {
      rawSessions = data.activeSessions;
    } else if (data?.activeSessionId) {
      rawSessions = [
        {
          sessionId: data.activeSessionId,
          email: data.activeEmail || 'admin@sode-edu.in',
          lastActiveAt: data.lastActiveAt || now,
          loggedInAt: data.loggedInAt || new Date().toISOString(),
        },
      ];
    }

    // Filter sessions that have not expired
    const activeSessions = rawSessions.filter((s) => {
      const elapsed = now - (s.lastActiveAt || 0);
      return elapsed < SESSION_TIMEOUT_MS;
    });

    const isCurrentlyActive = activeSessions.length > 0;
    const mostRecent = activeSessions[activeSessions.length - 1];
    const elapsed = mostRecent ? now - (mostRecent.lastActiveAt || 0) : 0;
    const remainingSeconds = Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000));

    return {
      isActive: isCurrentlyActive,
      activeSessionId: mostRecent?.sessionId,
      activeEmail: mostRecent?.email,
      lastActiveAt: mostRecent?.lastActiveAt,
      remainingSeconds,
      activeSessionsCount: activeSessions.length,
      maxSessions: MAX_CONCURRENT_ADMIN_SESSIONS,
      activeSessions,
    };
  } catch (error) {
    console.error('Error checking active admin sessions:', error);
    return { isActive: false, activeSessionsCount: 0, maxSessions: MAX_CONCURRENT_ADMIN_SESSIONS, activeSessions: [] };
  }
}

/**
 * Verify admin login with email, password, and enforce multi-session limit (up to 2 at a time)
 */
export async function verifyAdminLogin(
  email: string,
  password: string,
  newSessionId: string
): Promise<{ isValid: boolean; error?: string; inUse?: boolean; remainingSeconds?: number; email?: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const accounts = await getAllAdminCredentials();

  const matchedAccount = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
  if (!matchedAccount) {
    return { isValid: false, error: 'Invalid admin email address.' };
  }

  if (password !== matchedAccount.password) {
    return { isValid: false, error: 'Incorrect admin password.' };
  }

  // Check concurrent session limit (max 2 admins at a time)
  const sessionStatus = await getActiveAdminSession();
  const existingSessions = sessionStatus.activeSessions.filter((s) => s.sessionId !== newSessionId);

  if (existingSessions.length >= MAX_CONCURRENT_ADMIN_SESSIONS) {
    return {
      isValid: false,
      error: `The Admin Portal is currently in use by ${MAX_CONCURRENT_ADMIN_SESSIONS} administrators. Maximum of ${MAX_CONCURRENT_ADMIN_SESSIONS} active sessions allowed simultaneously.`,
      inUse: true,
      remainingSeconds: sessionStatus.remainingSeconds,
    };
  }

  // Add or update this session in activeSessions array
  const now = Date.now();
  const updatedSessions: ActiveAdminSessionItem[] = [
    ...existingSessions,
    {
      sessionId: newSessionId,
      email: cleanEmail,
      lastActiveAt: now,
      loggedInAt: new Date().toISOString(),
    },
  ];

  await adminDb.collection('admin_auth').doc('session').set({
    activeSessions: updatedSessions,
    activeSessionId: newSessionId,
    activeEmail: cleanEmail,
    lastActiveAt: now,
    loggedInAt: new Date().toISOString(),
  });

  return { isValid: true, email: cleanEmail };
}

/**
 * Touch / Keep-Alive heartbeat for an active session
 */
export async function touchAdminSession(sessionId: string): Promise<boolean> {
  try {
    const sessionDoc = await adminDb.collection('admin_auth').doc('session').get();
    if (!sessionDoc.exists) return false;

    const data = sessionDoc.data();
    const now = Date.now();

    let sessions: ActiveAdminSessionItem[] = [];
    if (Array.isArray(data?.activeSessions)) {
      sessions = data.activeSessions;
    } else if (data?.activeSessionId) {
      sessions = [
        {
          sessionId: data.activeSessionId,
          email: data.activeEmail || 'admin@sode-edu.in',
          lastActiveAt: data.lastActiveAt || now,
          loggedInAt: data.loggedInAt || new Date().toISOString(),
        },
      ];
    }

    // Filter non-expired and touch matching sessionId
    let found = false;
    const updatedSessions = sessions
      .filter((s) => now - (s.lastActiveAt || 0) < SESSION_TIMEOUT_MS)
      .map((s) => {
        if (s.sessionId === sessionId) {
          found = true;
          return { ...s, lastActiveAt: now };
        }
        return s;
      });

    if (found) {
      await adminDb.collection('admin_auth').doc('session').update({
        activeSessions: updatedSessions,
        lastActiveAt: now,
      });
      return true;
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
        activeSessions: [],
        activeSessionId: null,
        activeEmail: null,
        lastActiveAt: 0,
      });
      return;
    }

    const snap = await sessionRef.get();
    if (snap.exists) {
      const data = snap.data();
      let sessions: ActiveAdminSessionItem[] = Array.isArray(data?.activeSessions)
        ? data.activeSessions
        : [];

      if (sessionId) {
        sessions = sessions.filter((s) => s.sessionId !== sessionId);
      } else {
        sessions = [];
      }

      await sessionRef.set({
        activeSessions: sessions,
        activeSessionId: sessions[sessions.length - 1]?.sessionId || null,
        activeEmail: sessions[sessions.length - 1]?.email || null,
        lastActiveAt: sessions[sessions.length - 1]?.lastActiveAt || 0,
      });
    }
  } catch (error) {
    console.error('Error releasing admin session:', error);
  }
}

/**
 * Update admin password in Firestore for a specific admin email
 */
export async function updateAdminPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const accounts = await getAllAdminCredentials();

  const accountIndex = accounts.findIndex((a) => a.email.toLowerCase().trim() === cleanEmail);
  if (accountIndex === -1) {
    throw new Error(`Admin account with email "${cleanEmail}" not found.`);
  }

  if (currentPassword !== accounts[accountIndex].password) {
    throw new Error('Current password is incorrect.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const now = new Date();
  accounts[accountIndex].password = newPassword;
  accounts[accountIndex].updatedAt = now.toISOString();

  const docRef = adminDb.collection('admin_auth').doc('credentials');
  await docRef.set(
    {
      accounts,
      updatedAt: now.toISOString(),
      updatedAtFormatted: now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    },
    { merge: true }
  );

  return {
    success: true,
    message: `Password for ${cleanEmail} updated successfully! You can now use your new password.`,
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
  const accounts = await getAllAdminCredentials();

  const accountIndex = accounts.findIndex((a) => a.email.toLowerCase().trim() === cleanEmail);
  if (accountIndex === -1) {
    throw new Error('Current admin email does not match any registered administrator.');
  }

  if (currentPassword !== accounts[accountIndex].password) {
    throw new Error('Current password is incorrect.');
  }

  const finalEmail = newEmail ? newEmail.toLowerCase().trim() : cleanEmail;
  const finalPassword = newPassword && newPassword.trim().length >= 6 ? newPassword.trim() : accounts[accountIndex].password;

  if (newPassword && newPassword.trim().length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  accounts[accountIndex].email = finalEmail;
  accounts[accountIndex].password = finalPassword;
  accounts[accountIndex].updatedAt = new Date().toISOString();

  const now = new Date();
  const docRef = adminDb.collection('admin_auth').doc('credentials');
  await docRef.set(
    {
      accounts,
      email: accounts[0].email,
      password: accounts[0].password,
      updatedAt: now.toISOString(),
      updatedAtFormatted: now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    },
    { merge: true }
  );

  return {
    success: true,
    message: 'Admin credentials updated successfully! Please save your new login credentials.',
    updatedEmail: finalEmail,
  };
}
