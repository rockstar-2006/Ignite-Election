import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function getAdminCredential() {
  // 1. Direct environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  // 2. Explicit path in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const resolvedPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      : path.join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        return admin.credential.cert(JSON.parse(fileContent));
      } catch (err) {
        console.warn(`Failed to parse service account from ${resolvedPath}:`, err);
      }
    }
  }

  // 3. Fallback to standard service account JSON files in workspace root
  const standardFiles = [
    path.join(process.cwd(), 'service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
  ];

  for (const filePath of standardFiles) {
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return admin.credential.cert(JSON.parse(fileContent));
      } catch (err) {
        console.warn(`Failed to parse service account from ${filePath}:`, err);
      }
    }
  }

  return undefined;
}

if (!admin.apps.length) {
  try {
    const credential = getAdminCredential();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ignite-ai-7d7de';
    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${projectId}.firebasestorage.app`;

    if (credential) {
      admin.initializeApp({
        credential,
        storageBucket,
      });
    } else {
      admin.initializeApp({
        storageBucket,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

let _adminDb: admin.firestore.Firestore | null = null;
const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop, receiver) {
    if (!_adminDb && admin.apps.length > 0) {
      _adminDb = admin.firestore();
    }
    if (!_adminDb) {
      throw new Error('Firebase Admin DB is not initialized. Please check your Firebase service account configuration.');
    }
    const value = Reflect.get(_adminDb, prop, receiver);
    return typeof value === 'function' ? value.bind(_adminDb) : value;
  },
});

let _adminStorage: admin.storage.Storage | null = null;
const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(target, prop, receiver) {
    if (!_adminStorage && admin.apps.length > 0) {
      _adminStorage = admin.storage();
    }
    if (!_adminStorage) {
      throw new Error('Firebase Admin Storage is not initialized. Please check your Firebase service account configuration.');
    }
    const value = Reflect.get(_adminStorage, prop, receiver);
    return typeof value === 'function' ? value.bind(_adminStorage) : value;
  },
});

export { adminDb, adminStorage };
