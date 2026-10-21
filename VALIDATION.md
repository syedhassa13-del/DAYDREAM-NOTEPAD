# Daydream 2.1.1 — release review

Prepared 16 October 2026. This report distinguishes automated evidence from live production checks.

## Application connections

Vercel serves dist as a static website. The browser loads the Firebase SDK, signs in with Firebase Authentication, and reads/writes the default Firestore database in project daydream-47a16. There is no separate custom backend to start or server process to deploy on Vercel. Passwords are handled by Firebase Authentication, not stored in writing documents.

Firestore records use /users/{uid}/{table}/{entryId}. Each account has its own IndexedDB recovery cache and durable sync queue. Device save and cloud save are different statuses; the editor shows a quiet Saved label after successful saving, while pending or failed sync is shown through the account controls and persistent error feedback. Temporary transport failures retry with exponential backoff capped at 30 seconds. Permission errors and editing conflicts stay visible for user action.

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
- npm test suites: 16 review groups, 52 workspace groups, 20 account groups.
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

## Workspace navigation and guidance update — 19 October 2026

- In-world header uses d. plus the world name. Navigation order is All Worlds, Canvas, Dream Capture, Account, Help. Canvas contains Add section and Library; Account contains Log out. Menus support pointer hover, touch toggles, arrow keys and Escape.
- Removed the editor type badge, Save button and persistent account-storage footer. Autosaving, save-before-navigation, offline recovery and save failure protection remain active. Successful saves use a single inline Saved label; repeated routine save and position notifications are quiet.
- Added an anchored workspace guide with a spotlight and arrow beside real controls. It covers reality creation/naming, node movement/editing, sections, blank entries, writing, Library, connections and World Manuscript export. It waits for real successful actions, supports Skip/Back/replay and stores progress per account. The seven-slide tutorial remains available separately.
- Added integration coverage for guide progression, modal cancellation, save failure/recovery, persistent dismissal, replay, compact navigation, keyboard menus and narrow-screen tooltip placement.
- These changes have not been visually verified in a live browser, tested with a real signed-in Firebase account, or deployed to the external Vercel site from this environment.

## Compact guide revision — 19 October 2026

The guide now uses short one- or two-line hints and a smaller card without its heading or repeated helper text. Next and Back permit manual progression without completing actions. Title input immediately advances beyond the title hint; replay on a named document starts after that hint. Section-creation guidance points to the connection dot and describes dragging it onto empty canvas. Entry guidance uses the actual selected section action. Guide state upgrades to version 2 without clearing writing or previously dismissed/completed status. New integration coverage checks title-only progression and manual forward/back navigation.

## Approved ten-hint sequence — 19 October 2026

The contextual guide now contains only: create a reality, pencil rename, drag a node connection to create a section, open the section, use its Add action, title/text overview, Canvas, Dream Capture, All Worlds, and Help. No extra dialog, Library, manuscript or export tips are included. The writing hint advances on a click or pointer press inside either editor field, without needing text or a successful save. Creation dialogs hide the guide until the chosen section is ready. Straight arrow segments with forward-pointing markers replace all curved guide arrows. Header brand names use centered alignment and a small optical offset to match the navigation row. Tests follow the actual drag-to-create workflow through Dream Capture and back to Help, and verify arrow direction in both orientations.

## Manuscript overview hint

One informational World Manuscript hint follows the return-to-Canvas hint and precedes Dream Capture. Next continues without opening the manuscript; opening it also continues to Dream Capture in the header. Directly opening Dream Capture remains supported. The guide now has eleven hints, with no other new steps or changes to writing, saving or exports. Integration checks cover both manuscript-click progression and Next without navigation.

## Quiet sync notifications

Routine queued cloud saves no longer open a corner banner, including after a delay. The banner's hidden attribute now has an explicit display:none rule, fixing author CSS that could keep old status text visible. Actual offline, conflict and cloud errors remain available as dismissible notices; a dismissed ongoing issue stays quiet across further actions until sync recovers. Automated account checks cover CSS hiding, repeated normal updates, dismissal, repeated failures and a fresh warning after recovery. Autosaving, retries and device recovery are unchanged.

## Mobile navigation and balanced name field

The welcome/name form uses a full-width single-column grid with matching dialog gutters. On screens up to 760px the workspace header contains the brand and a single All Worlds disclosure. Its scrollable navigation contains the existing world, canvas, section, library, capture, account, logout and help controls, without duplicate action elements. Desktop navigation remains unchanged. The mobile menu supports click/touch, keyboard arrows, Escape, outside dismissal and closing after selection. Contextual header hints expand the navigation when required. Mobile rules reduce the header to 64px, keep section lists scrollable, wrap document tools, preserve a full-width writing area, stack Dream Capture, constrain dialogs and provide larger touch hit areas for canvas controls. DOM/CSS tests cover menu behavior and profile field width; real-device browser layout and mobile Google sign-in were not exercised in this environment.

## Mobile menu interaction correction

On mobile, Help is moved outside the All Worlds dropdown to the far right of the header; the same Help element returns to desktop navigation when resized. Canvas and Account now have real expandable submenus with visible chevrons and consistent label alignment. Touch blur no longer dismisses navigation before click; outside clicks, Escape and keyboard Tab dismissal remain supported. Mobile first-use guide progress is stored separately from desktop progress so desktop completion does not suppress mobile hints. Integration checks now exercise the actual mobile Add section dialog, section persistence, editing hints, Canvas, manuscript, Dream Capture, All Worlds, Help, Library, Account and logout. Physical mobile layout and real signed-in Firebase behavior still require live-device verification.


## Dream Capture revision — 21 October 2026

Dream Capture now uses one workspace header, with Canvas returning to the current session's last opened reality (All Worlds when none is available). The landing header/footer are hidden on every workspace route. The microphone and language control sit inside the writing field; the separate speech panel, manual Save button, and persistent storage explanation are removed. A concise speech-provider disclosure appears before first use in the current account session. Dictation shows interim words directly in the writing field and replaces provisional phrases as the browser refines them. Final phrases append without replacing previous writing. Manual input ends dictation and preserves the current visible transcript. Browser session endings resume with bounded empty-session retries; errors, stop, account reset and navigation end the session. Navigation waits for dictation completion and saving. Unsupported browsers retain a typing fallback.

The existing check and test suites pass, with three additional dictation/capture groups covering multiple sentences, restarts, repeat result events, permission denial, abort, live interim insertion and correction, preserved text, navigation saving and unsupported browsers. These tests simulate speech events; live microphone accuracy and real-device layout have not been verified. Firebase configuration, account storage adapter, rules and Vercel settings are unchanged.
