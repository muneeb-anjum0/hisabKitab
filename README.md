# HisabKitab

> Every rupee has a job.

[![Version](https://img.shields.io/github/v/release/muneeb-anjum0/hisabKitab?display_name=tag&style=flat-square&color=f4d431)](https://github.com/muneeb-anjum0/hisabKitab/releases/latest)
[![Web app](https://img.shields.io/badge/web-live-2d75e8?style=flat-square)](https://hisabkitab-a0c26.web.app)
[![CI](https://img.shields.io/github/actions/workflow/status/muneeb-anjum0/hisabKitab/quality.yml?branch=main&style=flat-square&label=build)](https://github.com/muneeb-anjum0/hisabKitab/actions/workflows/quality.yml)

HisabKitab is a comic-styled personal and household ledger for receiving money, dividing it into purpose-built Funds, and tracking where every amount goes. It is available as a responsive web application, an installable PWA, and a native Android package.

**[Open the web app](https://hisabkitab-a0c26.web.app)** · **[Download the latest Android release](https://github.com/muneeb-anjum0/hisabKitab/releases/latest)**

## What it does

- Organizes balances into separate, color-coded Funds.
- Records income, expenses, transfers, allocations, and shared-Fund membership.
- Traces allocated income through Money Lots using FIFO spending.
- Calculates balances from the ledger instead of storing mutable totals.
- Supports email/password and native Google authentication.
- Keeps the web experience installable and offline-aware.
- Presents activity and monthly recaps in the same inked comic design system.

## Ledger model

Fund balances are derived from allocations, signed expenses, adjustments, and linked transfer entries. Transfers move value between Funds without counting as income. Received money not represented by an allocation remains unallocated.

Every allocation is a Money Lot tied to its source, date, Fund, and original amount. Expenses consume the oldest available lot first unless a specific lot is selected. Transfers consume source lots and create linked destination history, preserving the complete money trail.

The primary Firestore collections are `users`, `publicProfiles`, `funds`, `fundMembers`, `remittances`, `allocations`, `transactions`, and `categories`. Access is enforced by the included owner/editor/viewer security rules.

## Technology

| Layer | Languages and technology |
| --- | --- |
| Interface | JavaScript, JSX, HTML, CSS, React, React Router |
| Web build | Vite |
| Authentication and data | Firebase Authentication, Cloud Firestore |
| Web deployment | Firebase Hosting and PWA service worker |
| Android package | Capacitor, Java, Android SDK, Gradle |
| Interaction | dnd-kit sortable drag and drop |
| Verification | Vitest and GitHub Actions |

The application code is primarily modern JavaScript/JSX and CSS. The Android container uses Java with Gradle build configuration; Capacitor packages the production Vite bundle as an Android APK while retaining native Google sign-in and system-bar integration.

## Deployment and releases

The production web build is deployed on [Firebase Hosting](https://hisabkitab-a0c26.web.app). Firestore rules and indexes are versioned alongside the application.

Stable Android builds are published through [GitHub Releases](https://github.com/muneeb-anjum0/hisabKitab/releases). The current repository snapshot also contains a single installable artifact at [`HisabKitab.apk`](./HisabKitab.apk). Release versions follow semantic versioning.

## Automated checks

GitHub Actions runs four independent checks on every push and pull request:

| Check | What it verifies |
| --- | --- |
| Ledger and Money Lots | Fund balances, income and expenses, transfers, archived Funds, monthly totals, deletion safety, Fund ordering, FIFO lot consumption, manual lot selection, insufficient balances, and legacy Money Lot behavior. |
| Dates, currency, and app configuration | PKR and international currency formatting, local calendar boundaries, PWA manifest and icons, safe-area viewport metadata, Capacitor identity, native Google authentication, Android system-bar settings, Firebase Hosting rewrites, Firestore policy files, and required environment keys. |
| Production web build | The complete Vite production build and the presence of the deployable HTML, PWA manifest, and service worker output. |
| Android APK build | A clean Java 21 Android compilation after rebuilding and synchronizing the Capacitor web bundle. The resulting APK is retained as a downloadable workflow artifact for 14 days. |

The unit suite currently contains 55 assertions across the financial calculations, date helpers, currency helpers, and platform contracts. Separating the workflow into four jobs makes it clear whether a failure belongs to ledger behavior, configuration, web packaging, or Android packaging.

## Repository map

```text
src/                  React application, domain logic, and styles
public/               PWA manifest, service worker, and web artwork
android/              Capacitor Android project and native resources
.github/workflows/    Automated test and production-build checks
firestore.rules       Firestore authorization policy
firestore.indexes.json
firebase.json         Firebase Hosting and Firestore deployment config
capacitor.config.json Native application configuration
HisabKitab.apk        Current stable Android build
```

## Data integrity

HisabKitab does not substitute dummy accounts or financial data. Firebase configuration is supplied through ignored local environment values, writes update only their affected client collections, and startup performs a full ledger reconciliation. Private user records remain self-only; the minimal authenticated public profile directory exists solely for exact-email Fund sharing.

---

Built and maintained by [Muneeb Anjum](https://github.com/muneeb-anjum0).
