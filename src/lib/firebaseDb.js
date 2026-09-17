import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { firebaseApp } from './firebaseApp';

function createDatabase() {
  if (!firebaseApp) return null;
  try {
    const native = window.Capacitor?.isNativePlatform?.() === true;
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: native ? persistentSingleTabManager() : persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: native,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db = createDatabase();
