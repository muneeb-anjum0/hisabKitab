import { initializeApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(
  (value) => value && !String(value).startsWith('YOUR_'),
);

export const firebaseApp = firebaseConfigured ? initializeApp(config) : null;

if (!firebaseConfigured) {
  console.warn(
    'HisabKitab: Firebase is not configured. Add your Firebase Web App values to .env.local and restart Vite.',
  );
}
