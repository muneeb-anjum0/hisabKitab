import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { firebaseApp } from './firebaseApp';

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

if (auth) setPersistence(auth, browserLocalPersistence).catch(console.warn);
