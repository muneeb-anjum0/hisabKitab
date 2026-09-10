const CACHE_PREFIX = 'hk-ledger-v3:';
const LEGACY_PREFIX = 'hk-ledger-v2:';
const MAX_CACHED_ACCOUNTS = 3;

const storageAvailable = () => typeof localStorage !== 'undefined';
const keyFor = (uid) => `${CACHE_PREFIX}${uid}`;

export function readLedgerCache(uid) {
  if (!storageAvailable() || !uid) return null;

  try {
    const snapshot = JSON.parse(localStorage.getItem(keyFor(uid)));
    return snapshot?.data && Array.isArray(snapshot.data.funds) ? snapshot.data : null;
  } catch {
    try {
      localStorage.removeItem(keyFor(uid));
    } catch {
      // The browser may disable storage entirely in strict privacy modes.
    }
    return null;
  }
}

export function writeLedgerCache(uid, data) {
  if (!storageAvailable() || !uid) return;

  try {
    localStorage.setItem(keyFor(uid), JSON.stringify({ savedAt: Date.now(), data }));
    pruneLedgerCaches(uid);
  } catch {
    try {
      pruneLedgerCaches(uid, 1);
      localStorage.setItem(keyFor(uid), JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      // Firestore's IndexedDB cache remains the fallback when storage is unavailable.
    }
  }
}

function pruneLedgerCaches(activeUid, maximum = MAX_CACHED_ACCOUNTS) {
  const snapshots = [];

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(LEGACY_PREFIX)) {
      localStorage.removeItem(key);
      continue;
    }
    if (!key?.startsWith(CACHE_PREFIX)) continue;

    try {
      const savedAt = JSON.parse(localStorage.getItem(key))?.savedAt || 0;
      snapshots.push({ key, savedAt });
    } catch {
      localStorage.removeItem(key);
    }
  }

  snapshots
    .filter(({ key }) => key !== keyFor(activeUid))
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(Math.max(0, maximum - 1))
    .forEach(({ key }) => localStorage.removeItem(key));
}
