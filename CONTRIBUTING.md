# Contributing

Thanks for helping improve HisabKitab. Keep changes focused, preserve the friendly
comic experience, and avoid mixing unrelated cleanup with product work.

## Before opening a pull request

1. Run `npm run check`.
2. Run `npm run format:check`.
3. Test the affected web flow and, for native-facing changes, sync and test Android.
4. Add or update focused tests whenever ledger calculations or data behavior changes.

## Project map

- `src/pages` contains screen-level composition.
- `src/components` contains reusable interface pieces.
- `src/lib` contains deterministic, tested ledger and platform utilities.
- `src/services` is the only browser-to-Firebase boundary.
- `src/contexts` owns authenticated application state and optimistic updates.

Do not commit private Firebase configuration, signing keys, generated build folders, or
personal ledger data. The committed APK is the published stable artifact; use a GitHub
release for new distributable builds.
