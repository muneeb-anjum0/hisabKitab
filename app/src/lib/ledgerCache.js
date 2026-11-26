const CACHE_PREFIX = 'hk-ledger-v4:';
const BACKUP_PREFIX = 'hk-ledger-backup-v4:';
const LEGACY_PREFIXES = ['hk-ledger-v2:', 'hk-ledger-v3:'];
const MAX_CACHED_ACCOUNTS = 3;

const storageAvailable = () => typeof localStorage !== 'undefined';
const keyFor = (uid) => `${CACHE_PREFIX}${uid}`;
const backupKeyFor = (uid) => `${BACKUP_PREFIX}${uid}`;
const validSnapshot = (snapshot) =>
  snapshot?.data &&
  Array.isArray(snapshot.data.funds) &&
  Array.isArray(snapshot.data.transactions) &&
  Array.isArray(snapshot.data.memberships);

const parseSnapshot = (key) => {
  try {
    const snapshot = JSON.parse(localStorage.getItem(key));
    return validSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
};

export function readLedgerCacheEntry(uid) {
  if (!storageAvailable() || !uid) return null;

  const primary = parseSnapshot(keyFor(uid));
  if (primary) return primary;

  const backup = parseSnapshot(backupKeyFor(uid));
  const recovered =
    backup ||
    LEGACY_PREFIXES.map((prefix) => parseSnapshot(`${prefix}${uid}`)).find(Boolean) ||
    null;
  if (!recovered) return null;

  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(recovered));
  } catch {
    // The recovered in-memory snapshot is still usable when storage is full.
  }
  return recovered;
}

export function readLedgerCache(uid) {
  return readLedgerCacheEntry(uid)?.data || null;
}

export function writeLedgerCache(uid, data, remoteSyncedAt = 0) {
  if (!storageAvailable() || !uid) return;

  const key = keyFor(uid);
  const next = JSON.stringify({ savedAt: Date.now(), remoteSyncedAt, data });
  try {
    const current = localStorage.getItem(key);
    if (current && parseSnapshot(key)) localStorage.setItem(backupKeyFor(uid), current);
    localStorage.setItem(key, next);
    pruneLedgerCaches(uid);
  } catch {
    try {
      pruneLedgerCaches(uid, 1);
      localStorage.setItem(key, next);
    } catch {
      // Firestore's IndexedDB cache remains the fallback when storage is unavailable.
    }
  }
}

function pruneLedgerCaches(activeUid, maximum = MAX_CACHED_ACCOUNTS) {
  const snapshots = [];

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (LEGACY_PREFIXES.some((prefix) => key?.startsWith(prefix))) {
      localStorage.removeItem(key);
      continue;
    }
    if (!key?.startsWith(CACHE_PREFIX)) continue;

    const snapshot = parseSnapshot(key);
    if (snapshot) snapshots.push({ key, savedAt: snapshot.savedAt || 0 });
    else localStorage.removeItem(key);
  }

  snapshots
    .filter(({ key }) => key !== keyFor(activeUid))
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(Math.max(0, maximum - 1))
    .forEach(({ key }) => {
      const uid = key.slice(CACHE_PREFIX.length);
      localStorage.removeItem(key);
      localStorage.removeItem(backupKeyFor(uid));
    });
}
