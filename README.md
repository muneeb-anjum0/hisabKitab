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

The included rules use deterministic membership IDs (`fundId_userId`) and enforce owner/editor/viewer access. A user document is readable to authenticated users so a Fund owner can look up an already-registered exact email. This is the Firebase-only sharing mechanism; it does not email invitations to people who have not registered.

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

Primary collections are `users`, `publicProfiles`, `funds`, `fundMembers`, `remittances`, `allocations`, `transactions`, and `categories`. `users` is private; `publicProfiles` contains only the minimal name/email directory needed for exact-email shared-Fund lookup. Dashboard and activity queries are deliberately capped in `src/services/dataService.js`; for a high-volume production account, add server-side monthly aggregates while keeping this ledger authoritative.

## PWA and offline behavior

The production build registers `public/sw.js` to cache the application shell. Firestore uses persistent multi-tab local cache and queues supported writes while offline. The UI shows network state. SVG artwork is used as the install icon; app stores may require exported PNG icons in additional fixed sizes.
