# Daydream — VS Code / Antigravity release

Version 2.1.1 · prepared 16 October 2026

A static HTML/CSS/JavaScript website with Firebase Authentication and Firestore account storage. This is the latest complete website, including the full-width flowing CTA, black tutorial, account forms, worlds canvas, writing controls, Dream Capture and PDF/JPG exports.

Read **VALIDATION.md** for what was verified and which live Firebase checks remain.

## Start here

1. Extract the ZIP completely. Open the **Daydream** folder in VS Code or Antigravity — the folder containing this README and package.json.
2. Install a current Node.js LTS release if Node is unavailable. This project requires Node 22.12 or later. Restart your editor after installation.
3. Open the editor terminal in this folder and run:

   ```sh
   npm run dev
   ```

4. Open the **actual Local URL printed in the terminal**. On another device on the same Wi-Fi, use a printed Network URL. The server listens on all IPv4 interfaces, chooses an available port, and remembers that port when possible. No fixed localhost address/port is embedded in the app.
5. Keep the terminal running. Stop with Ctrl+C.

Starting the website uses Node built-ins only: **npm install is not needed just to start it**. Firebase login/cloud sync still need internet access. Do not double-click dist/index.html; file:// is not a supported origin.

For an agent to do the setup, paste **ANTIGRAVITY_PROMPT.md** into Antigravity.

## Run the checks

```sh
npm ci
npm run check
npm test
npm run build
```

The build validates the static website; there is no bundler. Deploy **dist**, not the project source directory. `npm ci` installs development/test dependencies only; none are needed by the local launcher or production build.

## Before using Google login on a new address

Read **docs/FIREBASE_SETUP.md**. New localhost, network and Vercel addresses may require Firebase authorization. A ZIP cannot authorize a domain in your Firebase console. Keep the existing Firebase project and authDomain; changing them would point the app at different accounts or break Google login.

## GitHub and Vercel

Read **docs/DEPLOYMENT.md**. The release includes vercel.json configured to publish dist. No GitHub repository or Vercel project is connected automatically by extracting this ZIP. The private sign-ins for those services happen in your own editor/browser.

## What is included

- dist/: complete website, scripts, styles, local fonts and font licences.
- scripts/: dependency-free local/network launcher and build validation.
- tests/: persistence, editor, canvas, tutorial, exports, account sync, production Firebase adapter contracts, HTTP ID fallback and launcher checks. Legacy test fixtures are not shipped to the browser.
- firestore.rules / firestore.indexes.json / firebase.json: optional Firebase deployment configuration. Publishing on Vercel does not publish these rules.
- docs/: deployment, account setup, privacy and technical limits.

No node_modules, Git history, old screenshots, editor caches, server credentials, private keys or user writing are included. Firebase's web configuration is intentionally public; database security comes from Firebase Authentication and Firestore rules.
