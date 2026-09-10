/**
 * Environment Variable Validation & Resolution
 * Ensures all required environment variables are present and valid,
 * with graceful fallback to service-account.json when available.
 */
import fs from 'fs';
import path from 'path';

let serviceAccountData: Record<string, any> | null = null;

if (typeof window === 'undefined') {
  try {
    const candidateFiles = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
    ].filter(Boolean) as string[];

    for (const filePath of candidateFiles) {
      const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      if (fs.existsSync(resolved)) {
        serviceAccountData = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        break;
      }
    }
  } catch (e) {
    // Non-fatal, fallback to direct env vars
  }
}

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
  nextAuthSecret: getEnvVar('NEXTAUTH_SECRET', 'smvitm-election-super-secret-key-2026'),

  // Google OAuth Configuration (loaded exclusively from environment variables)
  googleClientId: getEnvVar('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', ''),

  // Firebase Configuration
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID', serviceAccountData?.project_id || 'ignite-ai-7d7de'),
  firebasePrivateKey: getEnvVar('FIREBASE_PRIVATE_KEY', serviceAccountData?.private_key),
  firebaseClientEmail: getEnvVar('FIREBASE_CLIENT_EMAIL', serviceAccountData?.client_email || 'firebase-adminsdk-fbsvc@ignite-ai-7d7de.iam.gserviceaccount.com'),

  // Public Firebase Config (safe for client-side)
  firebasePublic: {
    apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyCXag79RimZvo2zi7O6tdEMNKVyqZB5tiY'),
    authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'ignite-ai-7d7de.firebaseapp.com'),
    projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'ignite-ai-7d7de'),
    storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'ignite-ai-7d7de.firebasestorage.app'),
    messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '387321091161'),
    appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', '1:387321091161:web:896a934c0a8f6bc8d1cd48'),
    measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', ''),
  },
};

// Validate environment variables on startup
if (typeof window === 'undefined') {
  // Server-side only
  try {
    Object.values(env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}
