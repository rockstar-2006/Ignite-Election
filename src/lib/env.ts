/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }

  return value;
}

export const env = {
  // NextAuth Configuration
  nextAuthUrl: getEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),
  nextAuthSecret: getEnvVar('NEXTAUTH_SECRET'),

  // Google OAuth Configuration
  googleClientId: getEnvVar('GOOGLE_CLIENT_ID'),
  googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),

  // Firebase Configuration
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID'),
  firebasePrivateKey: getEnvVar('FIREBASE_PRIVATE_KEY'),
  firebaseClientEmail: getEnvVar('FIREBASE_CLIENT_EMAIL'),

  // Public Firebase Config (safe for client-side)
  firebasePublic: {
    apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
    measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', ''),
  },
};

// Validate environment variables on startup
if (typeof window === 'undefined') {
  // Server-side only
  try {
    // This will throw if any required env vars are missing
    Object.values(env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}
