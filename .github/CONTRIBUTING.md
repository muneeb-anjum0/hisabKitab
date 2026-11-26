# Contributing

Thanks for helping improve HisabKitab. Keep changes focused, preserve the friendly
comic experience, and avoid mixing unrelated cleanup with product work.

## Before opening a pull request

1. Run `npm run check`.
2. Run `npm run format:check`.
3. Test the affected web flow and, for native-facing changes, sync and test Android.
4. Add or update focused tests whenever ledger calculations or data behavior changes.

## Project map

- `website/` contains the public download landing page.
- `app/` contains the React application bundled into the Android APK.
- `app/src/pages/` contains screen-level composition.
- `app/src/components/` contains reusable interface pieces.
- `app/src/lib/` contains deterministic, tested ledger and platform utilities.
- `app/src/services/` is the browser-to-Firebase boundary.
- `app/src/contexts/` owns authenticated application state and optimistic updates.
- `android/` contains the native Capacitor project and widgets.
- `firebase/` contains Firestore rules and indexes; `firebase.json` connects them to deployment.
- `app/public/` contains shared static artwork and app assets.
- `releases/` holds the committed stable APK for archival use.
- `config/` holds Vite, ESLint, and Prettier configuration.

Copy `config/.env.example` to a root `.env.local` for local Firebase settings.

The repository root keeps the build, Capacitor, Firebase, and quality-tool configuration.
Run `npm run build` for the website or `npm run build:android` before syncing Capacitor.

Do not commit private Firebase configuration, signing keys, generated build folders, or
personal ledger data. The committed APK is the published stable artifact; use a GitHub
release for new distributable builds.
