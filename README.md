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
- **Secure by Default** — All data is scoped to the authenticated user; no one else can see your boxes

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
- Use **Settings → Manage Tags** to rename a tag across all items at once, or delete it entirely.
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

> **Security note:** These are client-side config values — they are safe to commit. Actual data access is controlled by Firestore Security Rules, not by keeping the config secret.

#### Firestore Security Rules (recommended)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boxes/{boxId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
    match /items/{itemId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

#### Firebase Authentication

Enable the sign-in providers you want in the Firebase Console → Authentication → Sign-in method. The `AuthModal` component handles both **Google** and **email/password** out of the box.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Build and deploy to Firebase Hosting |
| `npm run lint` | Run ESLint |
| `npm run backup` | Dump all Firestore collections to `.backups/` (requires service account) |
| `npm run import` | Import a backup JSON into Firestore (requires service account) |

### Project structure

```
storage-box-organizer/
├── public/                  # Static assets (SVG icons)
├── scripts/                 # Node.js admin scripts (Firebase Admin SDK)
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
2. Save the JSON file to `.secrets/<your-key-file>.json`.
3. Update the `serviceAccountPath` in each script accordingly.

```bash
# Backup all data
npm run backup

# Import from a specific backup file
node scripts/import-firestore.js .backups/firestore-backup-<timestamp>.json
```

> `.secrets/` and `.backups/` are git-ignored. Never commit service account keys.

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

---

## 🗺️ Architecture notes

- **Optimistic UI** — State updates happen immediately on the client; if the Firebase write fails, the state reverts and a toast error is shown.
- **Browser history** — `window.history.pushState` is used to make views deep-linkable. The back button navigates between box list → box contents → all items without a full page reload.
- **Dual storage layer** — `src/services/firebaseStorage.js` is the active backend. `src/storage.js` is a self-contained LocalStorage + IndexedDB implementation kept as a local fallback / reference (not wired into the app by default).
- **Tag operations** — Renaming or deleting a tag triggers a Firestore query for all items carrying that tag and batch-updates them.

---

## 📄 License

MIT — see `LICENSE` for details.