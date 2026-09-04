# HisabKitab

HisabKitab is a mobile-first personal and household ledger for receiving money once, splitting it into Funds, and spending against those Funds. It uses React, Vite, Firebase Authentication, Cloud Firestore, and a deliberately inked comic-editorial design system.

## Run locally

```bash
npm install
npm run dev
```

The application requires Firebase configuration and never substitutes a fake user or dummy financial data. With placeholder credentials, it shows a configuration screen instead of entering the ledger.

## Firebase setup

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. In **Build → Authentication → Sign-in method**, enable **Email/Password** and **Google**.
3. In **Build → Firestore Database**, create a database. Choose the region closest to your users. Do not use open production rules.
4. In **Project settings → General → Your apps**, add a Web app and copy its configuration.
5. Copy `.env.example` to `.env.local` (the repository already includes a placeholder local file) and replace every placeholder:

```env
VITE_FIREBASE_API_KEY=apiKey
VITE_FIREBASE_AUTH_DOMAIN=authDomain
VITE_FIREBASE_PROJECT_ID=projectId
VITE_FIREBASE_STORAGE_BUCKET=storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=messagingSenderId
VITE_FIREBASE_APP_ID=appId
```

These six values come directly from the Firebase `firebaseConfig` object. Restart Vite after changing them. `.env.local` is ignored by Git.

6. Add `localhost` and your deployment domain under **Authentication → Settings → Authorized domains**.
7. Install and authenticate the Firebase CLI, then select your project and deploy the rules/indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

The included rules use deterministic membership IDs (`fundId_userId`) and enforce owner/editor/viewer access. Private `users` documents are self-only; exact-email sharing uses the minimal authenticated `publicProfiles` directory. This Firebase-only sharing mechanism does not email people who have not registered.

## Commands

```bash
npm run dev       # local Vite server
npm test          # calculation test suite
npm run build     # production bundle
npm run preview   # preview the production bundle
firebase deploy   # Firestore configuration + Firebase Hosting
```

## Ledger model

Fund balances are never stored or incremented independently. They are calculated as allocations minus expenses, plus signed adjustments and signed transfer entries. A transfer creates two linked entries and never counts as income. Any received amount not represented by allocations remains unallocated.

### Money Lots and FIFO

Every allocation is also a Money Lot: a traceable batch tied to its remittance, sender, date, Fund, and original amount. Existing allocations automatically appear as historical Money Lots; no migration or duplication is required. New expenses store a `lotUsages` breakdown on the transaction. The default allocation strategy consumes the oldest available lot first (FIFO). A user can select a specific lot; if it is insufficient, the remainder continues through available lots in FIFO order. Legacy expenses without `lotUsages` are replayed FIFO at calculation time.

Transfers consume Money Lots in the source Fund and derive a destination transfer lot linked to the paired transfer entry. Money Lot balances, like Fund balances, are calculated from the ledger and are never independently mutated.

Primary collections are `users`, `publicProfiles`, `funds`, `fundMembers`, `remittances`, `allocations`, `transactions`, and `categories`. `users` is private; `publicProfiles` contains only the minimal name/email directory needed for exact-email shared-Fund lookup. Dashboard and activity queries are deliberately capped in `src/services/dataService.js`; for a high-volume production account, add pagination and server-side monthly aggregates while keeping this ledger authoritative.

Confirmed mutations update only their affected local collections instead of reloading every Firestore query. A full reconciliation remains available through `refresh()` for startup, retry, and membership changes.

## PWA and offline behavior

The production build registers `public/sw.js` to cache the application shell. Firestore uses persistent multi-tab local cache and queues supported writes while offline. The UI shows network state. The manifest includes 192px, 512px, maskable 512px, and Apple touch icons, plus standalone display, scope, theme, and safe-area metadata.
