# Daydream 2.1.1 — release review

Prepared 16 October 2026. This report distinguishes automated evidence from live production checks.

## Application connections

Vercel serves dist as a static website. The browser loads the Firebase SDK, signs in with Firebase Authentication, and reads/writes the default Firestore database in project daydream-47a16. There is no separate custom backend to start or server process to deploy on Vercel. Passwords are handled by Firebase Authentication, not stored in writing documents.

Firestore records use /users/{uid}/{table}/{entryId}. Each account has its own IndexedDB recovery cache and durable sync queue. Device save and cloud save are different statuses; wait for Saved to your account before checking another device. Temporary transport failures retry with exponential backoff capped at 30 seconds. Permission errors and editing conflicts stay visible for user action.

## Screen and workflow review

The following flows were inspected in source and exercised in DOM/storage simulations. This is not a live browser visual inspection.

| Screen | Verified behavior |
| --- | --- |
| Landing and authentication | Workspace requires login; Google/email/password controls, reset, optional pen name and restored account sessions |
| All Worlds | Visible create action; single-click opening, pencil editing, drag without opening; logo returns home |
| World canvas | Unique section functions; documents stay inside their sections; removing connections preserves writing |
| Section library | Correct type only; pagination, search and blank entry creation |
| Writing | User-selected chapter number/title, formatting, internal links, save before leaving, retained draft on failure |
| Dream Capture | Editable text, unsupported-browser voice fallback, saved capture assignment |
| World Manuscript | Permanent node, grouped writing with headings, real paginated PDF and JPG output |
| Tutorial | Seven slides, looping, pause/replay and reduced-motion behavior |

## Checks passed

- npm run check: static build, linked assets, client syntax, three launcher/request-handler tests.
- npm test suites: 16 review groups, 47 workspace groups, 20 account groups.
- Three additional production Firebase adapter contract groups passed using mocked SDK responses: project/UID paths, revisioned atomic writes and conflict handling, paginated account-specific metadata.
- All retained tests are included in npm test.
- Large-data test: 1,000 chapter records and 200 character records remain individually editable. This is not a live cloud load test.
- Portable Windows temporary paths used by export tests.
- ZIP integrity checked; no dependencies, Git history, credentials, runtime cache or user writing included.

## Cleanup and fixes

- Removed unused story-editor.js and node-workspace.js implementations.
- Moved legacy node/export utilities to test fixtures; removed the unused legacy export script from the browser page.
- Added bounded retries for temporary Firestore failures, cancellation on logout, and tests ensuring permission errors do not retry continuously.
- Added revalidation headers to avoid serving stale app scripts after deployments.
- Kept login requirement, UID-scoped storage, existing public Firebase configuration, and all current visual design.

## Required live checks before public release

Live Firebase endpoint requests timed out from this execution environment. No live Google popup, reset-email delivery, authenticated Firestore write, deployed rules, domain authorization, phone/LAN connection or browser layout check is claimed.

1. In the existing Firebase project, verify Google and Email/Password providers are enabled.
2. Confirm published Firestore rules restrict all app paths to the signed-in UID and support the bundled revisioned record format. Publishing to Vercel does not publish Firebase rules/indexes.
3. Add the final Vercel hostname to Firebase Authentication authorized domains.
4. On that HTTPS address, sign in, create a world/section/chapter, wait for Saved to your account and refresh. Check from a second device with the same account; check a separate account cannot see that work.
5. Test document and World Manuscript PDF/JPG exports and the mobile layout.

Use docs/FIREBASE_SETUP.md and docs/DEPLOYMENT.md. Do not replace the Firebase project, remove login, make the database public, or enable billing as a workaround. This release is ready for those deployment checks, not a guarantee of zero production issues.
