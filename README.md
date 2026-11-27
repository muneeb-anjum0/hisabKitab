# HisabKitab

> Every rupee has a job.

[![Latest release](https://img.shields.io/github/v/release/muneeb-anjum0/hisabKitab?style=flat-square&color=f4d431)](https://github.com/muneeb-anjum0/hisabKitab/releases/latest)
[![Website](https://img.shields.io/badge/website-visit-2d75e8?style=flat-square)](https://hisabkitab-a0c26.web.app)
[![Checks](https://img.shields.io/github/actions/workflow/status/muneeb-anjum0/hisabKitab/quality.yml?branch=main&style=flat-square)](https://github.com/muneeb-anjum0/hisabKitab/actions/workflows/quality.yml)

HisabKitab is a comic-styled money manager built around one simple rule: give every
rupee a purpose. Track what comes in, divide it into Funds, record spending, and see
where your money went without wrestling with a traditional spreadsheet.

## Get HisabKitab

- [Explore HisabKitab](https://hisabkitab-a0c26.web.app)
- [Download the Android APK](https://github.com/muneeb-anjum0/hisabKitab/releases/latest/download/HisabKitab.apk)

To install the APK, download `HisabKitab.apk`, open it on your Android phone, and
approve installation from your browser or file manager when Android asks.

Versions 1.0.3 and newer use the same signing key and can update one another. If you
have 1.0.2 installed, sync or export your data first, then uninstall it before installing
the latest version.

## Highlights

- Separate money into color-coded Funds.
- Record money received, expenses, and transfers.
- See recent activity and month-by-month breakdowns.
- Export styled monthly and per-Fund Excel workbooks.
- Continue working offline and sync changes when the connection returns.
- Share selected Funds with other registered users.
- Add, edit, reorder, archive, and remove Funds and categories.
- Use square and rectangular Android home-screen widgets for quick actions.
- Set monthly Fund limits and review spending by Fund and category.
- Schedule monthly income and expenses, with optional Android reminders.
- Export an account backup and restore it to the same empty account.

## Your data

Your ledger is tied to your account and synchronized through Firebase. Offline
changes are cached on your device and queued for synchronization. Shared Funds are
visible only to the members added to them.

For safety, keep an account backup from Profile. It contains Funds you own and their
money lots. When restoring a shared Fund, contributions from other people are
reconstructed under your account because their private income records are not in
your backup. Excel exports remain available for reports.

## Project quality

Automated checks cover money calculations, backup validation, recurring dates, and
Firestore access rules. Android launch timing can be measured on a connected phone
with `scripts/benchmark-android.sh`; results depend on the device and its state.

## Planned enhancements

The goal is to keep HisabKitab focused and easy to use while making it more helpful
for everyday Pakistani personal and household finance. These are planned ideas, not
promises or release dates.

- More flexible recurrence schedules and background reminders.
- Richer spending insights and cash-flow views.
- Receipt and bill attachments for important transactions.
- Faster shared-Fund collaboration, member roles, and an easier way to settle up.
- Search improvements, saved filters, tags, and smarter transaction suggestions.
- Better onboarding with sample data and a guided first-budget setup.
- Optional biometric/PIN app lock for an extra layer of privacy on a shared phone.
- Home-screen widgets, quick-add shortcuts, and notification actions that make daily
  logging quicker.
- Accessibility improvements, including stronger contrast choices and larger-text support.
- A smoother path to Play Store distribution and regular stable releases.

## Support

If something behaves unexpectedly, open a
[GitHub issue](https://github.com/muneeb-anjum0/hisabKitab/issues) with your device,
Android or browser version, and a short description of what happened.

---

Built and maintained by [Muneeb Anjum](https://github.com/muneeb-anjum0).
