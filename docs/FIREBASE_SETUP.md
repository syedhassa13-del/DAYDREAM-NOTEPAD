# Firebase setup and network testing

The website already points to Firebase project **daydream-47a16**. Its public web config remains in dist/firebase-client.js. Do not replace authDomain with localhost, a LAN IP, or your Vercel hostname. Do not add Admin SDK credentials to this website.

## Required once per new environment

1. Sign in to https://console.firebase.google.com/ using the Google account that owns the project.
2. Open daydream-47a16 → Authentication → Sign-in method. Verify Google and Email/Password are enabled.
3. Open Authentication → Settings → Authorized domains. Add `localhost` if missing, and the exact hostname of the final Vercel deployment (without https://, path or port).
4. For LAN testing, use the exact Network URL printed by npm run dev. If Google reports auth/unauthorized-domain, authorize the hostname shown by that URL when Firebase accepts it. Do not add 0.0.0.0: that is a bind address, not a browser destination. Google sign-in on a raw HTTP network IP is not guaranteed. Use the authorized HTTPS Vercel URL for reliable cross-device authentication testing if the IP is rejected or the browser blocks the popup.
5. Confirm the (default) Firestore database exists and its rules isolate users by auth.uid. The bundled firestore.rules is a stricter version compatible with this app. Review and publish rules through the Firebase console using your own account; the ZIP does not change live rules. Never use public read/write test rules to fix a login or save error.

The bundled rules match the app's UID-scoped paths and revisioned records. The currently published rules were not accessible from this environment; verify them before release. Vercel does not deploy Firebase rules or indexes. If the database already contains this app's records, do not create a new database or change the project ID.

## Verify before sharing

- On localhost, log in, create a reality, add Chapters, write a named chapter with a number you choose, and wait for **Saved to your account**.
- Refresh: confirm the text, number, formatting and section return. Open/close the sidebar and return to All Worlds.
- Open the Network URL on the same Wi-Fi, log in to the SAME account and open the chapter after sync. This should show account data, not device-local storage from another origin.
- Add a character, link selected chapter text to it, and export a document and World Manuscript as PDF/JPG.
- Log out. A workspace link must request login. Log in again and confirm restoration. Try a second account: it must have its own data.
- Check Account if status says sync is pending/unavailable. Do not clear browser data before pending changes sync.

## Why a different URL can look new

Browser storage belongs to an origin (scheme + hostname + port). localhost, a LAN IP, a new port and a Vercel domain have separate local caches. Synced writing follows the Firebase account. Unsynced writing needs its original browser origin to finish syncing. The local launcher reuses its last port when possible; keep using the same preferred URL.

## LAN and microphone limitations

Devices must share a reachable network. Allow Node on your private network in Windows Firewall if prompted. Guest Wi-Fi isolation, VPNs and some company networks can block device-to-device access. The server cannot override firewall/network policy.

HTTP LAN addresses are usually not secure browser contexts. Secure document IDs use getRandomValues when randomUUID is unavailable, so world/chapter creation does not depend on randomUUID. Speech recognition may require HTTPS, browser support and microphone permission; typing/pasting remains available. Speech services may use the browser vendor; audio is not silently uploaded by the app.

Optional HTTPS development: set both DAYDREAM_HTTPS_CERT and DAYDREAM_HTTPS_KEY to local certificate/key paths before starting. The certificate must be valid/trusted on each testing device; the launcher does not create or trust certificates. Keep these files in ignored certs/ or outside the project. An authorized HTTPS deployment is simpler for final testing.

Official references:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/start
- https://firebase.google.com/docs/firestore/security/get-started
