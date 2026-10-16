# GitHub → Vercel

## GitHub

Use a new **private repository** initially. In VS Code, Source Control → Initialize Repository, then Publish to GitHub → Private. Complete GitHub's own browser sign-in when prompted. Alternatively, an authenticated GitHub CLI can create a private repository from this folder. Do not force-push to or overwrite a repository that already contains unrelated work.

Before publishing, confirm .gitignore is present. Commit dist, scripts, tests, package.json, package-lock.json, vercel.json, Firebase rule/index files, and docs. Do not commit node_modules, .vercel, .daydream-runtime, .env files, certificates, tokens, or service-account credentials. The Firebase web config is public configuration, not a server credential.

GitHub sign-in is separate from Firebase sign-in. Your website accounts continue using the existing Firebase project.

## Vercel

1. Open https://vercel.com/ and sign in with your own account.
2. Add New → Project → import the GitHub repository.
3. Use **Other** as Framework Preset. Root Directory: the folder containing package.json and vercel.json (the repository root if you pushed the contents of Daydream).
4. vercel.json already sets: Install `npm ci --omit=dev`; Build `npm run build`; Output `dist`. No application server or start command is required on Vercel. Keep Node at a supported version meeting package.json's engine requirement.
5. Deploy. Copy the resulting HTTPS hostname.
6. Add that exact hostname in Firebase Authentication → Settings → Authorized domains. Keep the existing Firebase authDomain unchanged.
7. Test email/password and Google login, saving, refresh and a second device using the checklist in FIREBASE_SETUP.md.

Do not deploy the whole source directory as public static files. Only dist is public output.

Subsequent commits to the connected production branch trigger Vercel deployments according to your project's settings. Preview deployments may have different hostnames: use a stable authorized hostname for sign-in testing. This package does not create accounts, grant GitHub access, connect Vercel, publish Firestore rules, change plans or enable billing.

The deployment revalidates public assets so new releases do not rely on stale cached JavaScript.

## Environment variables

No secret environment variable is required for the existing Firebase web setup. If you later change Firebase projects, update only the public client configuration and separately configure providers/rules for that project. Never embed a service-account JSON file or private API token in dist.

## Deployment checks

- Root URL serves the landing page, scripts/styles/fonts return successfully.
- Workspace URLs use # fragments; no server-side route rewrite is necessary.
- Google popup is allowed and the deployed hostname is authorized in Firebase.
- Firestore rules use the user's UID; no public test rules.
- No broad CSP/COOP header is added here that could block Firebase imports or Google popups.
- Check actual cloud sync status before expecting another device to see changes.

Official references:
- https://vercel.com/docs/deployments
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/git/vercel-for-github
