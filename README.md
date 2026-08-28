# 📦 Storage Box Organizer

A clean, cloud-synced web app for cataloguing your physical storage boxes and their contents — with photos, tags, and fuzzy search. Never lose track of where you put something again.

---

## ✨ Features

- **Box & Item Catalog** — Create named boxes, add items to them with descriptions and photos
- **Multi-image Support** — Attach multiple photos to any box or item; browse them with a built-in image slider
- **Fuzzy Search** — Instantly find items by name, description, or tag across your entire collection, powered by [Fuse.js](https://www.fusejs.io/)
- **Tagging System** — Tag items freely; bulk-rename or delete tags from a central manager
- **Sort & Filter** — Sort by newest, oldest, or name (A–Z / Z–A); filter any view by tag
- **"All Items" View** — Browse every item across all boxes in one unified list, with box attribution
- **Unassigned Items** — Items can exist without a box; assign or reassign them at any time
- **Dark & Light Theme** — Toggle between themes; preference is saved per browser
- **Import / Export** — Back up your data as a JSON file and restore it with a progress modal
- **Browser History** — Deep-linkable views via URL hashes (`#box/<id>`, `#all-items`)
- **Invite-only** — Anyone can create an account, but nothing is readable until the owner approves it; data is then scoped per user, enforced by Firestore rules

---

## 🖥️ Live App

The app is deployed on Firebase Hosting. Sign in with your Google account or email to get started.

---

## 👤 End-User Guide

### Getting started

1. Open the app and sign in (Google or email/password).
2. On the **Your Boxes** tab, click **+ New Box** to create your first box.
3. Give it a name, description, and optionally one or more photos.
4. Click into a box, then **+ Add Item** to start cataloguing its contents.

### Navigating

| View | How to reach it |
|---|---|
| All boxes | Click the logo or **Your Boxes** tab |
| Inside a box | Click any box card |
| All items | Click the **Your Items** tab |

### Working with items

- **Assign / move** — When editing an item, choose a different box from the dropdown, or leave it blank to keep it unassigned.
- **Remove from box** — Clicking the remove button inside a box view unassigns the item but keeps it in "Your Items".
- **Delete permanently** — Deleting from the "Your Items" view removes the item and its data entirely.
- **Reassign an existing item to a box** — From inside a box, use **Add Item → Select Existing** to pick an already-catalogued item.

### Tags

- Add tags to any item when creating or editing it.
- Tags are **case-insensitive** and stored in lowercase — `Books` and `books` are the same tag.
- Use **Settings → Manage Tags** to rename a tag across all items at once, or delete it entirely. Renaming a tag to one that already exists merges the two.
- Filter any view by tag using the **Filter** dropdown in the controls bar.

### Backup & restore

- **Export** — Settings → Export. Downloads a `.json` file with all boxes and items.
- **Import** — Settings → Import. Select your `.json` backup; a progress modal tracks the restore. Fresh copies are created, so re-importing won't duplicate data.

---

## 🛠️ Developer Guide

### Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 7 |
| Styling | Custom CSS (CSS variables, Tailwind-style utility classes) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Fuzzy search | Fuse.js |
| Backend / Auth | Firebase (Firestore + Authentication) |
| Image processing | Browser Canvas API (base64, max 800 × 800 @ 0.7 quality) |
| ID generation | uuid v4 |
| Hosting | Firebase Hosting |
| Admin scripts | Node.js + Firebase Admin SDK |

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Firebase project** with Firestore, Authentication, and Hosting enabled
- Firebase CLI: `npm install -g firebase-tools`

### Local setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd storage-box-organizer

# 2. Install dependencies
npm install

# 3. Configure Firebase (see section below)

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Firebase configuration

The Firebase config is in `src/firebase.js`. For your own deployment, replace the values with those from your Firebase project's settings:

```js
// src/firebase.js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

> **Security note:** These are client-side config values, and they ship inside the JavaScript bundle of every deployment — they are not secrets and are safe to commit. What protects the data is the Firestore Security Rules, not the config being hidden.

#### Firestore Security Rules

The live ruleset lives in [`firestore.rules`](firestore.rules) and is deployed with `firebase deploy --only firestore:rules` (or as part of `npm run deploy`). It enforces two independent gates:

1. **Approval** — the account must carry the `approved` custom claim (see [Access control](#access-control) below).
2. **Ownership** — every document carries a `userId`, and an approved account may only touch its own.

Both are covered by tests you can run without touching a real project:

```bash
npm run test:rules     # spins up the Firestore emulator, needs Java
```

#### Firebase Authentication

Only **email/password** is enabled — `AuthModal` has no other provider wired up. Turn it on in Firebase Console → Authentication → Sign-in method.

### Access control

Firebase Auth accepts a sign-up from anyone holding the web API key, and that key is public by necessity — it is in the bundle every visitor downloads. So *signed in* cannot mean *allowed*, and on the free Spark plan a stranger creating accounts is a stranger spending your daily read/write quota.

The rules therefore refuse **everything** until an account is granted the `approved` custom claim:

```bash
npm run access                          # list every account and its status
npm run access grant you@example.com    # let someone in
npm run access revoke them@example.com  # lock someone out
```

An unapproved account gets a "waiting for approval" screen showing its email and account ID, plus a **Check again** button that forces a token refresh. Granting takes effect on the next refresh — that button, or signing out and back in.

> **Before you deploy these rules for the first time**, approve yourself. A ruleset that nobody is approved for locks everyone out, including you:
>
> ```bash
> npm run access grant you@example.com   # first
> firebase deploy --only firestore:rules # then
> ```

#### Further hardening (optional, both free)

- **Restrict the API key** — Google Cloud Console → APIs & Services → Credentials → your browser key → *Website restrictions*, limited to your Hosting domain. The Android build loads the app from that same origin (`capacitor.config.json` → `server.url`), so it keeps working.
- **Enable App Check** — reCAPTCHA v3 for web, Play Integrity for Android. Blocks requests that do not come from your app at all.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Build and deploy to Firebase Hosting |
| `npm run lint` | Run ESLint |
| `npm run translations:check` | Verify `en`/`bg` string files agree with each other and with the code |
| `npm run test:rules` | Run the Firestore security-rules tests against the emulator (needs Java) |
| `npm run access` | List / grant / revoke account approval (requires service account) |
| `npm run backup` | Dump all Firestore collections to `.backups/` (requires service account) |
| `npm run import` | Import a backup JSON into Firestore (requires service account) |

### Project structure

```
storage-box-organizer/
├── public/                  # Static assets (SVG icons)
├── scripts/                 # Node.js admin scripts (Firebase Admin SDK)
│   ├── lib/admin.js         # Shared Admin SDK bootstrap + key lookup
│   ├── grant-access.js      # List / grant / revoke the `approved` claim
│   ├── backup-firestore.js  # Dump Firestore → .backups/*.json
│   ├── import-firestore.js  # Restore from backup JSON
│   ├── delete-user-data.js  # Remove all data for a given UID
│   └── verify-firestore.js  # Sanity-check documents in Firestore
├── src/
│   ├── components/          # All React UI components
│   │   ├── AddBoxModal.jsx
│   │   ├── AddItemModal.jsx
│   │   ├── AuthModal.jsx
│   │   ├── BoxCard.jsx
│   │   ├── BoxList.jsx
│   │   ├── ConfirmationDialog.jsx
│   │   ├── EditBoxModal.jsx
│   │   ├── EditItemModal.jsx
│   │   ├── FullscreenImageModal.jsx
│   │   ├── ImageSlider.jsx
│   │   ├── ImportProgressModal.jsx
│   │   ├── ItemCard.jsx
│   │   ├── ItemList.jsx
│   │   ├── Modal.jsx
│   │   ├── SearchBar.jsx
│   │   ├── SettingsMenu.jsx
│   │   ├── TagManagementModal.jsx
│   │   └── Toast.jsx
│   ├── services/
│   │   ├── firebaseStorage.js  # All Firestore CRUD operations
│   │   └── storage.js          # LocalStorage + IndexedDB fallback
│   ├── utils/
│   │   ├── dateUtils.js        # Date formatting helpers
│   │   └── imageUtils.js       # Image resize / base64 conversion
│   ├── App.jsx                 # Root component — all state and view logic
│   ├── firebase.js             # Firebase app initialisation and exports
│   ├── index.css               # Global styles and CSS custom properties
│   └── main.jsx                # React entry point
├── firebase.json               # Firebase Hosting config
├── firestore.rules             # Firestore Security Rules (deployed from here)
├── firestore.rules.test.mjs    # Emulator tests for the rules
├── .firebaserc                 # Firebase project alias
├── vite.config.js
└── package.json
```

### Data model

All documents in Firestore are scoped by `userId` so that queries never leak between accounts.

#### Box

```ts
{
  id: string          // UUID v4
  userId: string      // Firebase Auth UID
  name: string
  description: string
  images: string[]    // base64 data URLs (resized to max 800×800)
  image: string       // First image — kept for backward compatibility
  createdAt: number   // Unix timestamp (ms)
}
```

#### Item

```ts
{
  id: string          // UUID v4
  userId: string      // Firebase Auth UID
  boxId: string       // UUID of parent box, or '' if unassigned
  name: string
  description: string
  images: string[]    // base64 data URLs (resized to max 800×800)
  image: string       // First image — kept for backward compatibility
  tags: string[]
  createdAt: number   // Unix timestamp (ms)
  modifiedAt: number  // Unix timestamp (ms), set on updates
}
```

### Image storage

Images are resized client-side (max **800 × 800 px**, JPEG quality **0.7**) using the browser Canvas API, then stored as **base64 data URLs** directly in Firestore documents. No Firebase Storage bucket is used. This keeps the architecture simple but does mean large document sizes for image-heavy collections; keep this in mind when planning Firestore read costs.

### Admin scripts setup

The scripts in `scripts/` use the **Firebase Admin SDK** and require a service account key:

1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**.
2. Save the JSON file to `.secrets/`. That is all — `scripts/lib/admin.js` picks up the first `*.json` it finds there, or the file `$GOOGLE_APPLICATION_CREDENTIALS` points at.

```bash
# Backup all data
npm run backup

# Import from a specific backup file
node scripts/import-firestore.js .backups/firestore-backup-<timestamp>.json
```

> `.secrets/` and `.backups/` are git-ignored. Never commit service account keys — unlike the web config above, these *are* real credentials, and they grant full admin access to the project.

### Deploying

```bash
# Authenticate once
firebase login

# Deploy (builds first, then deploys to Firebase Hosting)
npm run deploy
```

Or deploy separately:

```bash
npm run build
firebase deploy --only hosting
```

### Releases and versioning

Merging to `main` triggers `.github/workflows/release.yml`, which runs
[standard-version](https://github.com/conventional-changelog/standard-version):
it bumps the version in `package.json`, writes `CHANGELOG.md`, tags the commit
and pushes. It does **not** deploy — run `npm run deploy` after the merge, or the
live app stays on the previous build.

Two things keep the version honest, and both exist because they were once
missing:

**Only code releases.** The workflow ignores pushes that touch nothing but
`**/*.md`, `docs/**`, `LICENSE` or `.github/**`. `standard-version` bumps a patch for *any*
commit type, so without this a typo fix in a README produced a new version whose
changelog entry was empty. A mixed push still releases normally — `paths-ignore`
skips a run only when every changed file matches.

**The PR title is the release note.** PRs are squash-merged, and GitHub builds
the squash commit's subject from the PR title. That subject is the only thing
`standard-version` reads, so a branch full of well-formed `feat:` commits still
ships as a patch with an empty changelog if the title says `chore:`. Title the
PR after the most significant change in it.

`.github/workflows/pr-title.yml` enforces both halves of that: the title must be
a Conventional Commit, and it must not claim a smaller bump than its own commits
do. You can run the same check locally:

```bash
.github/scripts/check-pr-title.sh "feat(ui): add an About dialog"
.github/scripts/check-pr-title.sh "chore: tidy up" main HEAD   # also compares commits
```

---

## 🗺️ Architecture notes

- **Optimistic UI** — State updates happen immediately on the client; if the Firebase write fails, the state reverts and a toast error is shown.
- **Browser history** — `window.history.pushState` is used to make views deep-linkable. The back button navigates between box list → box contents → all items without a full page reload.
- **Dual storage layer** — `src/services/firebaseStorage.js` is the active backend. `src/storage.js` is a self-contained LocalStorage + IndexedDB implementation kept as a local fallback / reference (not wired into the app by default).
- **Tag operations** — Renaming or deleting a tag triggers a Firestore query for all items carrying that tag and batch-updates them.

---

## 📄 License

MIT — see `LICENSE` for details.