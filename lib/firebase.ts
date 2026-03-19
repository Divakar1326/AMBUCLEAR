import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function sanitizeEnvValue(value?: string): string {
  if (!value) return '';

  // Handles accidental wrapping quotes copied from dashboards.
  const trimmed = value.trim();
  const withoutWrappingQuotes = trimmed.replace(/^['\"]|['\"]$/g, '');

  // Recover API keys from accidental prefixes like: yo "AIza..."
  const apiKeyMatch = withoutWrappingQuotes.match(/AIza[0-9A-Za-z_-]+/);
  if (apiKeyMatch) {
    return apiKeyMatch[0];
  }

  return withoutWrappingQuotes;
}

// Firebase configuration - you'll add your credentials in .env.local
const firebaseConfig = {
  apiKey: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// Initialize Firebase (client-side safe)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
