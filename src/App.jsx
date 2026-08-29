import { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { BoxList } from './components/BoxList';
import { ItemList } from './components/ItemList';
import { AddBoxModal } from './components/AddBoxModal';
import { AddItemModal } from './components/AddItemModal';
import { EditBoxModal } from './components/EditBoxModal';
import { EditItemModal } from './components/EditItemModal';
import { AuthModal } from './components/AuthModal';
import { AccessPendingScreen } from './components/AccessPendingScreen';
import { FullscreenImageModal } from './components/FullscreenImageModal';
import { ImageSlider } from './components/ImageSlider';
import { TagManagementModal } from './components/TagManagementModal';
import { SettingsMenu } from './components/SettingsMenu';
import { OverflowMenu } from './components/OverflowMenu';
import { ImportProgressModal } from './components/ImportProgressModal';
import { AboutModal } from './components/AboutModal';
import { Toast } from './components/Toast';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { EmptyState } from './components/EmptyState';
import { SkeletonGrid } from './components/SkeletonGrid';
import { AppIntro } from './components/AppIntro';
import { ArrowLeft, PackageOpen, LogOut, Package, Edit, Trash2, Calendar, History, Plus, SearchX, WifiOff, Pencil } from 'lucide-react';
import { firebaseStorage } from './services/firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { formatDate } from './utils/dateUtils';
import { getImageRefs, refsToThumbs, makeDerivatives } from './utils/imageUtils';
import { SortFilterBar } from './components/SortFilterBar';
import { checkForUpdate, applyUpdate } from './native/updates';
import { hideSplash } from './native';
import { v4 as uuidv4 } from 'uuid';
import { loadDraft, saveDraft, clearDraft } from './utils/draftStorage';
import { useTranslation } from './translations';
import { normalizeTag, normalizeTags, tagVariants, hasTag } from './utils/tagUtils';

// Visual-inspection fixtures. `import.meta.env.DEV` is inlined as a literal at
// build time, so every branch below folds away and the data never reaches the
// production bundle.
// Visual-inspection fixtures, dev only. Deliberately messy — long Bulgarian
// names, several photos, an untagged item and one with no box — so the states
// that only show up with real data can be checked at a phone width.
// `import.meta.env.DEV` is inlined at build time, so all of this folds away
// and never reaches the production bundle.

const MOCK_BOXES = [
  {
    id: "mock-box-1",
    name: "Кутия със зимни дрехи - таван",
    description: "Пуловери, шалове и якета от миналата зима",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%233b82f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 1.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%233b82f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 1.1</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%236366f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 1.2</text></svg>"],
    userId: "mock-user-123",
    createdAt: Date.now() - 0 * 86400000
  },
  {
    id: "mock-box-2",
    name: "Документи и гаранции 2019-2024",
    description: "Договори, гаранционни карти, стари сметки",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%238b5cf6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 2.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%238b5cf6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 2.1</text></svg>"],
    userId: "mock-user-123",
    createdAt: Date.now() - 1 * 86400000
  },
  {
    id: "mock-box-3",
    name: "Инструменти",
    description: "Отвертки, клещи, свредла",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%230ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 3.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%230ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 3.1</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%2314b8a6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 3.2</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%2322c55e'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Box 3.3</text></svg>"],
    userId: "mock-user-123",
    createdAt: Date.now() - 2 * 86400000
  },
  {
    id: "mock-box-4",
    name: "Кухня — резервни съдове",
    description: "",
    image: null,
    images: [],
    userId: "mock-user-123",
    createdAt: Date.now() - 3 * 86400000
  }
];

const MOCK_ITEMS = [
  {
    id: "mock-item-1",
    name: "Зимно яке, тъмносиньо",
    description: "Мембрана, размер L",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%2310b981'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 1.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%2310b981'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 1.1</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%230ea5e9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 1.2</text></svg>"],
    boxId: "mock-box-1",
    userId: "mock-user-123",
    createdAt: Date.now() - 0 * 3600000,
    tags: ["зимно", "дрехи"]
  },
  {
    id: "mock-item-2",
    name: "Шапки и шалове",
    description: "Вълнени, кутия отдясно",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23f59e0b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 2.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23f59e0b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 2.1</text></svg>"],
    boxId: "mock-box-1",
    userId: "mock-user-123",
    createdAt: Date.now() - 1 * 3600000,
    tags: ["зимно"]
  },
  {
    id: "mock-item-3",
    name: "Гаранция за пералня Bosch WAT",
    description: "Изтича 03.2027",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23ef4444'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 3.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23ef4444'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 3.1</text></svg>"],
    boxId: "mock-box-2",
    userId: "mock-user-123",
    createdAt: Date.now() - 2 * 3600000,
    tags: ["документи", "гаранция", "техника"]
  },
  {
    id: "mock-item-4",
    name: "Акумулаторен винтоверт Makita",
    description: "С две батерии и зарядно",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%236366f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 4.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%236366f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 4.1</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%238b5cf6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 4.2</text></svg>", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23ec4899'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 4.3</text></svg>"],
    boxId: "mock-box-3",
    userId: "mock-user-123",
    createdAt: Date.now() - 3 * 3600000,
    tags: ["инструменти"]
  },
  {
    id: "mock-item-5",
    name: "Комплект бургии",
    description: "",
    image: null,
    images: [],
    boxId: "mock-box-3",
    userId: "mock-user-123",
    createdAt: Date.now() - 4 * 3600000,
    tags: ["инструменти"]
  },
  {
    id: "mock-item-6",
    name: "Кафемашина",
    description: "Още не е прибрана в кутия",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23a855f7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 6.1</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'><rect width='120' height='90' fill='%23a855f7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='11' font-family='sans-serif'>Item 6.1</text></svg>"],
    boxId: "",
    userId: "mock-user-123",
    createdAt: Date.now() - 5 * 3600000,
    tags: ["кухня"]
  }
];
/** Is this the seeded, no-Firebase view used for visual inspection? */
const isMockAuth = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('mock-auth') === 'true';

// The tag filter doubles as a "show me the unfiled ones" switch. A sentinel
// rather than a real tag, so it can never collide with something a user typed.
const UNASSIGNED_FILTER = '__unassigned__';

// How long a delete waits before it is written, so the toast can offer Undo.
const UNDO_WINDOW_MS = 6000;

// Launch screen. The floor stops it flashing past on a warm start, where the
// IndexedDB cache answers in a few milliseconds; the ceiling stops a hung read
// from leaving the user staring at it.
const INTRO_MIN_MS = 1100;
const INTRO_MAX_MS = 6000;

// Floor between automatic syncs. Coming back to the app and regaining a signal
// often happen within the same second — waking the phone on wifi does both —
// and there is nothing to gain from reading the same data twice.
const AUTO_SYNC_MIN_GAP_MS = 30000;

/** One filter/search/sort pipeline, shared by the box view and All Items. */
function filterSortItems(list, { query, tag, sortOrder }) {
  let result = list;

  if (tag === UNASSIGNED_FILTER) {
    result = result.filter(item => !item.boxId);
  } else if (tag) {
    result = result.filter(item => hasTag(item, tag));
  }

  if (query) {
    const fuse = new Fuse(result, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.3,
    });
    result = fuse.search(query).map(r => r.item);
  }

  return [...result].sort((a, b) => {
    switch (sortOrder) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
      case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
      default: return 0;
    }
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const introStartedAt = useRef(Date.now());
  // refreshData closes over user and currentBox, so the listeners below cannot
  // capture it once — they would keep syncing against whatever was on screen
  // when the app started. This ref always holds the current one.
  const refreshRef = useRef(null);
  const autoSyncRef = useRef(null);
  const lastSyncAt = useRef(0);
  // Signed in, but Firestore refuses everything: the account has not been
  // granted the `approved` claim. See AccessPendingScreen.
  const [accessDenied, setAccessDenied] = useState(false);
  const { t } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  const [importState, setImportState] = useState({
    isImporting: false,
    progress: 0,
    phase: '',
    current: 0,
    total: 0
  });
  const [view, setView] = useState('boxes'); // 'boxes' | 'items' | 'allItems'
  const [currentBox, setCurrentBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // All items for selection
  const [searchQuery, setSearchQuery] = useState('');
  const [boxSearchQuery, setBoxSearchQuery] = useState('');

  // Reopen whichever modal was open before a mobile camera-induced page reload.
  // Initialized synchronously (not via effect) so it isn't clobbered by the
  // persistence effect below on the first render.
  const restoredModal = loadDraft('active_modal');
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(restoredModal?.kind === 'add-box');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(restoredModal?.kind === 'add-item');
  const [editingBox, setEditingBox] = useState(restoredModal?.kind === 'edit-box' ? restoredModal.entity : null);
  const [editingItem, setEditingItem] = useState(restoredModal?.kind === 'edit-item' ? restoredModal.entity : null);


  const [itemSortOrder, setItemSortOrder] = useState('newest'); // 'name-asc', 'name-desc', 'newest', 'oldest'
  const [selectedTag, setSelectedTag] = useState('');

  const [boxSortOrder, setBoxSortOrder] = useState('newest');
  const [selectedBoxTag, setSelectedBoxTag] = useState('');

  const [isTagManagementModalOpen, setIsTagManagementModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState({ isOpen: false, refs: [], name: '', startIndex: 0 });
  const [toasts, setToasts] = useState([]);
  // First load only: distinguishes "still fetching" from "you have nothing",
  // which used to look identical (an empty grid).
  const [dataLoading, setDataLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  // Hero image out of view -> show the compact box header instead.
  const [heroHidden, setHeroHidden] = useState(false);
  const heroRef = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  });
  const fileInputRef = useRef(null);

  // Notification Helpers
  const addToast = (message, type = 'info', options = {}) => {
    // Date.now() alone collides when two toasts land in the same millisecond.
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, type, ...options }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const askConfirm = (options) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title || t('common.areYouSure'),
      message: options.message || '',
      type: options.type || 'danger',
      onConfirm: options.onConfirm
    });
  };

  // Check the live deployment for a newer build and offer to reload into it.
  const handleCheckForUpdates = async () => {
    addToast(t('update.checking'), 'info');
    try {
      const { updateAvailable } = await checkForUpdate();
      if (updateAvailable) {
        askConfirm({
          title: t('update.availableTitle'),
          message: t('update.availableMessage'),
          type: 'primary',
          onConfirm: applyUpdate
        });
      } else {
        addToast(t('update.latest'), 'success');
      }
    } catch {
      addToast(t('update.failed'), 'error');
    }
  };

  // Auth Listener
  useEffect(() => {
    if (isMockAuth()) {
      setUser({ uid: 'mock-user-123', email: 'mock@example.com' });
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Hand the native splash over to <AppIntro/> as soon as React paints: same
  // icon, same background, same position, so nothing appears to change — but
  // from here on the screen is ours, and it speaks the chosen language.
  useEffect(() => {
    hideSplash();
    const cap = setTimeout(() => setIntroDone(true), INTRO_MAX_MS);
    return () => clearTimeout(cap);
  }, []);

  // Dismiss it once there is something to show. Everything below the early
  // return still mounts and its effects still run, so this waits on the very
  // data load it is covering.
  const bootReady = !authLoading
    && (!user || accessDenied || !dataLoading || boxes.length > 0 || allItems.length > 0);

  useEffect(() => {
    if (introDone || !bootReady) return;
    const wait = Math.max(0, INTRO_MIN_MS - (Date.now() - introStartedAt.current));
    const id = setTimeout(() => setIntroDone(true), wait);
    return () => clearTimeout(id);
  }, [bootReady, introDone]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setBoxes([]);
      setItems([]);
      setAllItems([]);
      setAccessDenied(false);
    }
  }, [user]);

  // Browser history support
  useEffect(() => {
    const handlePopState = async (event) => {
      if (event.state) {
        const { view: historyView, boxId, boxName } = event.state;

        if (historyView === 'boxes') {
          setCurrentBox(null);
          setView('boxes');
          setSearchQuery('');
          setBoxSearchQuery('');
          setSelectedTag('');
          if (isMockAuth()) {
            setBoxes(MOCK_BOXES);
            setItems(MOCK_ITEMS);
          } else if (user) {
            const loadedBoxes = await firebaseStorage.getBoxes();
            setBoxes(loadedBoxes);
            const allItems = await firebaseStorage.getAllItems();
            setItems(allItems);
          }
        } else if (historyView === 'items' && boxId) {
          const box = boxes.find(b => b.id === boxId) || { id: boxId, name: boxName };
          setCurrentBox(box);
          setItems(isMockAuth()
            ? MOCK_ITEMS.filter(i => i.boxId === boxId)
            : await firebaseStorage.getItems(boxId));
          setView('items');
          setSearchQuery('');
          setBoxSearchQuery('');
          setSelectedTag('');
        } else if (historyView === 'allItems') {
          setCurrentBox(null);
          setItems(isMockAuth() ? MOCK_ITEMS : await firebaseStorage.getAllItems());
          setView('allItems');
          setSearchQuery('');
          setBoxSearchQuery('');
          setSelectedTag('');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initialize history state if not set
    if (!window.history.state) {
      window.history.replaceState({ view: 'boxes' }, '', window.location.pathname + window.location.search);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, boxes]);

  // Handle Initial Hash on Load
  useEffect(() => {
    if (user && boxes.length > 0) {
      const hash = window.location.hash;
      if (hash.startsWith('#box/')) {
        const boxId = hash.replace('#box/', '');
        const box = boxes.find(b => b.id === boxId);
        if (box) {
          handleBoxClick(box);
        }
      } else if (hash === '#all-items') {
        handleListAllItems();
      }
    }
  }, [user, boxes.length]);

  // Persist which modal is open so a mobile camera-induced page reload can
  // reopen it. The modal itself restores its own form draft (see useModalDraft).
  useEffect(() => {
    let descriptor = null;
    if (isAddBoxModalOpen) descriptor = { kind: 'add-box' };
    else if (isAddItemModalOpen) descriptor = { kind: 'add-item' };
    else if (editingItem) descriptor = { kind: 'edit-item', entity: editingItem };
    else if (editingBox) descriptor = { kind: 'edit-box', entity: editingBox };

    if (descriptor) saveDraft('active_modal', descriptor);
    else clearDraft('active_modal');
  }, [isAddBoxModalOpen, isAddItemModalOpen, editingItem, editingBox]);

  // Connectivity. Firestore keeps working offline against its local cache, so
  // without this the user has no way of telling that what they are looking at —
  // and what they are changing — has not reached the server.
  useEffect(() => {
    // Regaining a signal is also the moment the local cache is most likely to
    // be behind: Firestore flushes its own queued writes by itself, but reads
    // stay as they were until something asks again.
    const goOnline = () => {
      setIsOffline(false);
      autoSyncRef.current?.();
    };
    const goOffline = () => setIsOffline(true);

    // Coming back to the app after it was in the background — where another
    // device may have changed things — is the other such moment. visibility
    // covers both a browser tab and the native WebView.
    const onVisible = () => {
      if (document.visibilityState === 'visible') autoSyncRef.current?.();
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Deletes are held for a few seconds before they are written, so the toast
  // can offer a way back. The row leaves the screen immediately either way.
  const pendingCommits = useRef(new Map());

  const scheduleCommit = (key, commit) => {
    const timer = setTimeout(() => {
      pendingCommits.current.delete(key);
      commit();
    }, UNDO_WINDOW_MS);
    pendingCommits.current.set(key, { timer, commit });
  };

  /** Cancel a scheduled write. Returns false if it has already gone through. */
  const cancelCommit = (key) => {
    const entry = pendingCommits.current.get(key);
    if (!entry) return false;
    clearTimeout(entry.timer);
    pendingCommits.current.delete(key);
    return true;
  };

  // Leaving the page inside the undo window must not quietly resurrect what the
  // user deleted: flush anything still waiting. Firestore queues the write in
  // its offline layer, so it survives the unload.
  useEffect(() => {
    const pending = pendingCommits.current;
    const flush = () => {
      pending.forEach(({ timer, commit }) => { clearTimeout(timer); commit(); });
      pending.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // Swap the hero image for a compact bar once it has scrolled away, so Back
  // and the box actions stay reachable without scrolling back to the top.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) { setHeroHidden(false); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroHidden(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, currentBox?.id]);

  // Resolves to true when the data is loaded, false when the account is not
  // allowed to read it. AccessPendingScreen re-runs this after a token refresh
  // to find out whether approval has come through.
  const refreshData = async () => {
    if (!user) return true;
    if (isMockAuth()) {
      setBoxes(MOCK_BOXES);
      setAllItems(MOCK_ITEMS);
      if (currentBox) {
        setItems(MOCK_ITEMS.filter(i => i.boxId === currentBox.id));
      } else {
        setItems(MOCK_ITEMS);
      }
      lastSyncAt.current = Date.now();
      setDataLoading(false);
      return true;
    }

    setDataLoading(true);
    lastSyncAt.current = Date.now();
    try {
      const loadedBoxes = await firebaseStorage.getBoxes();
      setBoxes(loadedBoxes);

      // Always load all items for selection purposes
      const allItemsData = await firebaseStorage.getAllItems();
      const sortedAllItems = [...allItemsData].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllItems(sortedAllItems);

      if (currentBox) {
        const loadedItems = await firebaseStorage.getItems(currentBox.id);
        const sortedItems = [...loadedItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setItems(sortedItems);
      } else {
        setItems(sortedAllItems);
      }

      setAccessDenied(false);
      return true;
    } catch (err) {
      // The security rules reject every read until the account is approved.
      if (err?.code === 'permission-denied') {
        setAccessDenied(true);
        return false;
      }
      console.error('Failed to load data', err);
      addToast(t('data.loadFailed'), 'error');
      return false;
    } finally {
      setDataLoading(false);
    }
  };

  // Pull from the server without saying anything. Used by the two moments where
  // the data on screen is most likely to be behind: coming back to the app, and
  // regaining a connection after edits were queued locally.
  const autoSync = () => {
    if (!auth.currentUser && !isMockAuth()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (Date.now() - lastSyncAt.current < AUTO_SYNC_MIN_GAP_MS) return;
    refreshRef.current?.();
  };

  useEffect(() => {
    refreshRef.current = refreshData;
    autoSyncRef.current = autoSync;
  });

  // Handle Box Selection
  const handleBoxClick = async (box) => {
    setCurrentBox(box);
    let boxItems = [];
    if (isMockAuth()) {
      boxItems = MOCK_ITEMS.filter(i => i.boxId === box.id);
    } else {
      boxItems = await firebaseStorage.getItems(box.id);
    }
    const sortedItems = [...boxItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setItems(sortedItems);
    setView('items');
    setSearchQuery('');
    setBoxSearchQuery('');
    setSelectedTag('');

    // Push to browser history
    window.history.pushState(
      { view: 'items', boxId: box.id, boxName: box.name },
      '',
      `#box/${box.id}`
    );
  };

  // Handle Back to Home
  const handleBack = () => {
    setCurrentBox(null);
    setView('boxes');
    setSearchQuery('');
    setBoxSearchQuery('');
    setSelectedTag('');
    refreshData();

    // Push to browser history
    window.history.pushState({ view: 'boxes' }, '', '#');
  };

  // Turn a modal's image list into lightweight refs ({id, thumb}) stored on the
  // entity. New captures ({thumb, full}) get a full-res doc written to the
  // `images` collection; existing refs ({id, thumb}) are kept as-is; legacy
  // full-only entries are re-derived into a proper thumb/full pair.
  const persistImageRefs = async (modalImages, ownerType, ownerId) => {
    const refs = [];
    for (const img of (modalImages || [])) {
      if (!img) continue;
      if (img.id) {
        refs.push({ id: img.id, thumb: img.thumb });
        continue;
      }
      let { thumb, full } = img;
      if (!full) full = thumb;
      if (!full) continue;
      if (!thumb || thumb === full) {
        const d = await makeDerivatives(full);
        if (d) ({ thumb, full } = d);
      }
      const ref = await firebaseStorage.saveImage({ thumb, full }, { ownerType, ownerId });
      refs.push(ref);
    }
    return refs;
  };

  // The box an item currently sits in ('' when unassigned) — read before a
  // mutation drops the item from local state.
  const findItemBoxId = (itemId) =>
    (items.find(i => i.id === itemId) || allItems.find(i => i.id === itemId))?.boxId || '';

  // Mark one or more boxes as "contents changed" and reflect it immediately in
  // the UI. Only add / remove / move / delete of items counts as a change —
  // editing a box's or an item's photos, text or tags deliberately does not.
  // Best effort: a failed stamp must never fail the operation that caused it.
  const touchBoxes = async (...boxIds) => {
    const ids = [...new Set(boxIds.filter(Boolean))];
    if (!ids.length) return;

    const updatedAt = Date.now();
    setBoxes(prev => prev.map(b => ids.includes(b.id) ? { ...b, updatedAt } : b));
    setCurrentBox(prev => (prev && ids.includes(prev.id) ? { ...prev, updatedAt } : prev));

    try {
      await Promise.all(ids.map(id => firebaseStorage.touchBox(id, updatedAt)));
    } catch (err) {
      console.error('Failed to stamp box update time', err);
    }
  };

  // Handle Adding Box
  const handleAddBox = async (payload) => {
    try {
      const id = uuidv4();
      const refs = await persistImageRefs(payload.images, 'box', id);

      const newBox = {
        id,
        name: payload.name,
        description: payload.description,
        images: refs,
        image: refs[0]?.thumb || null, // Backward compatibility (thumb)
        createdAt: Date.now()
      };
      // Persist to Firebase
      const savedBox = await firebaseStorage.addBox(newBox);

      setBoxes(prev => [savedBox, ...prev]);
      setIsAddBoxModalOpen(false);
    } catch (error) {
      console.error("Error adding box:", error);
      addToast(t('box.addFailed'), "error");
    }
  };

  // Handle Adding Item
  const handleAddItem = async (payload) => {
    try {
      const id = uuidv4();
      const refs = await persistImageRefs(payload.images, 'item', id);

      const newItem = {
        id,
        name: payload.name,
        description: payload.description,
        images: refs,
        image: refs[0]?.thumb || null, // Backward compatibility (thumb)
        tags: payload.tags || [],
        boxId: payload.boxId || '',
        createdAt: Date.now()
      };

      // Persist to Firebase
      await firebaseStorage.addItem(newItem);

      // Update local state
      setItems(prev => [newItem, ...prev]);
      setAllItems(prev => [newItem, ...prev]);
      setIsAddItemModalOpen(false);
      await touchBoxes(newItem.boxId);
    } catch (error) {
      console.error("Error adding item:", error);
      addToast(t('item.addFailed'), "error");
    }
  };

  // Remove an item from its box without deleting it (it stays in "All Items").
  const handleRemoveItemFromBox = async (itemId) => {
    askConfirm({
      title: t('item.removeFromBoxTitle'),
      message: t('item.removeFromBoxMessage'),
      type: 'primary',
      onConfirm: async () => {
        const previousBoxId = findItemBoxId(itemId);
        const snapshot = items.find(i => i.id === itemId) || allItems.find(i => i.id === itemId);

        // Optimistic update - remove from current view
        setItems(prev => prev.filter(i => i.id !== itemId));

        try {
          await firebaseStorage.updateItem(itemId, { boxId: '' });
          // Update allItems to reflect the change
          setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, boxId: '' } : i));
          await touchBoxes(previousBoxId);
          addToast(t('item.removedToast'), "success", {
            duration: UNDO_WINDOW_MS,
            actionLabel: t('common.undo'),
            onAction: async () => {
              try {
                await firebaseStorage.updateItem(itemId, { boxId: previousBoxId });
                setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, boxId: previousBoxId } : i));
                if (snapshot) setItems(prev => [snapshot, ...prev.filter(i => i.id !== itemId)]);
                await touchBoxes(previousBoxId);
              } catch (err) {
                console.error('Failed to undo remove', err);
                refreshData();
              }
            }
          });
        } catch (err) {
          console.error('Failed to remove item from box', err);
          refreshData(); // Revert on error
          addToast(t('item.removeFailed'), "error");
        }
      }
    });
  };

  // Permanently delete an item (available from both the box view and All Items).
  //
  // The write is deferred by the undo window. Deleting an item also deletes its
  // image documents, so a delete that has actually happened cannot be undone by
  // writing the item back — the only honest "undo" is to not have deleted yet.
  const handleDeleteItem = async (itemId) => {
    askConfirm({
      title: t('item.deleteTitle'),
      message: t('item.deleteMessage'),
      type: 'danger',
      onConfirm: () => {
        const previousBoxId = findItemBoxId(itemId);
        const snapshot = items.find(i => i.id === itemId) || allItems.find(i => i.id === itemId);
        const wasInView = items.some(i => i.id === itemId);

        // Optimistic update
        setItems(prev => prev.filter(i => i.id !== itemId));
        setAllItems(prev => prev.filter(i => i.id !== itemId));

        scheduleCommit(`item:${itemId}`, async () => {
          try {
            await firebaseStorage.deleteItem(itemId);
            await touchBoxes(previousBoxId);
          } catch (err) {
            console.error('Failed to delete item', err);
            refreshData(); // Revert on error
            addToast(t('item.deleteFailed'), "error");
          }
        });

        addToast(t('item.deletedToast'), "success", {
          duration: UNDO_WINDOW_MS,
          actionLabel: t('common.undo'),
          onAction: () => {
            if (!cancelCommit(`item:${itemId}`) || !snapshot) return;
            if (wasInView) setItems(prev => [snapshot, ...prev]);
            setAllItems(prev => [snapshot, ...prev]);
          }
        });
      }
    });
  };

  async function handleDeleteBox(id) {
    // Cascading and immediate — name the scope, since there is no way back.
    const doomedCount = allItems.filter(i => i.boxId === id).length;
    askConfirm({
      title: t('box.deleteTitle'),
      message: doomedCount > 0
        ? t('box.deleteMessageCount', { count: doomedCount })
        : t('box.deleteMessageEmpty'),
      type: 'danger',
      onConfirm: async () => {
        // Optimistic update
        setBoxes(prev => prev.filter(b => b.id !== id));
        setItems(prev => prev.filter(i => i.boxId !== id));
        setAllItems(prev => prev.filter(i => i.boxId !== id));

        if (currentBox?.id === id) {
          handleBack();
        }

        try {
          await firebaseStorage.deleteBox(id);
          addToast(t('box.deletedToast'), "success");
        } catch (err) {
          console.error('Failed to delete box', err);
          refreshData(); // Revert
          addToast(t('box.deleteFailed'), "error");
        }
      }
    });
  };

  async function handleRemoveBox(id) {
    askConfirm({
      title: t('box.removeTitle'),
      message: t('box.removeMessage', { unassigned: t('box.unassigned') }),
      type: 'primary',
      onConfirm: async () => {
        // Optimistic update - remove box from list and unassign items
        setBoxes(prev => prev.filter(b => b.id !== id));
        setItems(prev => prev.map(i => i.boxId === id ? { ...i, boxId: '' } : i));
        setAllItems(prev => prev.map(i => i.boxId === id ? { ...i, boxId: '' } : i));

        if (currentBox?.id === id) {
          handleBack();
        }

        try {
          // 1. Find all items in this box
          const boxItems = await firebaseStorage.getItems(id);

          // 2. Update all items to have no boxId
          await Promise.all(boxItems.map(item =>
            firebaseStorage.updateItem(item.id, { boxId: '' })
          ));

          // 3. Delete the box
          await firebaseStorage.deleteBox(id);
          addToast(t('box.removedToast'), "success");
        } catch (err) {
          console.error('Failed to remove box', err);
          refreshData(); // Revert
          addToast(t('box.removeFailed'), "error");
        }
      }
    });
  };

  // Handle Editing Box
  const handleEditBox = (box) => {
    setEditingBox(box);
  };

  const handleUpdateBox = async (updates) => {
    if (!editingBox) return;

    try {
      let processedUpdates = { ...updates };

      if (updates.images && Array.isArray(updates.images)) {
        // Save any new captures, keep existing refs, then prune image docs the
        // user removed during the edit.
        const refs = await persistImageRefs(updates.images, 'box', editingBox.id);
        const oldIds = getImageRefs(editingBox).map(r => r.id).filter(Boolean);
        const newIds = refs.map(r => r.id).filter(Boolean);
        const removed = oldIds.filter(id => !newIds.includes(id));
        if (removed.length) await firebaseStorage.deleteImagesByIds(removed);

        processedUpdates.images = refs;
        processedUpdates.image = refs[0]?.thumb || null;
      }

      // Optimistic update
      setBoxes(prev => prev.map(b =>
        b.id === editingBox.id ? { ...b, ...processedUpdates } : b
      ));

      if (currentBox?.id === editingBox.id) {
        setCurrentBox(prev => ({ ...prev, ...processedUpdates }));
      }

      // Persist to Firebase
      const updatedBox = await firebaseStorage.updateBox(editingBox.id, processedUpdates);

      // Update with server data
      setBoxes(prev => prev.map(b =>
        b.id === editingBox.id ? updatedBox : b
      ));

      if (currentBox?.id === editingBox.id) {
        setCurrentBox(updatedBox);
      }

      setEditingBox(null);
    } catch (err) {
      console.error('Failed to update box', err);
      refreshData(); // Revert on error
      addToast(t('box.updateFailed', { error: err.message }), "error");
    }
  };

  // Handle Editing Item
  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleUpdateItem = async (payload) => {
    if (!editingItem) return;

    try {
      // Save new captures, keep existing refs, prune removed image docs.
      const refs = await persistImageRefs(payload.images, 'item', editingItem.id);
      const oldIds = getImageRefs(editingItem).map(r => r.id).filter(Boolean);
      const newIds = refs.map(r => r.id).filter(Boolean);
      const removed = oldIds.filter(id => !newIds.includes(id));
      if (removed.length) await firebaseStorage.deleteImagesByIds(removed);

      // Persist to Firebase
      // We pass the fields that changed. internal logic in updateItem handles merging.
      const persistedItem = await firebaseStorage.updateItem(editingItem.id, {
        name: payload.name,
        description: payload.description,
        images: refs,
        image: refs[0]?.thumb || null,
        tags: payload.tags || [],
        boxId: payload.boxId || ''
      });

      setItems(prev => prev.map(item => item.id === editingItem.id ? persistedItem : item));
      setAllItems(prev => prev.map(item => item.id === editingItem.id ? persistedItem : item));
      setEditingItem(null);

      // Only a box reassignment counts as a contents change; name, description,
      // photo and tag edits leave both boxes' "Updated" dates alone.
      const previousBoxId = editingItem.boxId || '';
      const nextBoxId = persistedItem.boxId || '';
      if (previousBoxId !== nextBoxId) {
        await touchBoxes(previousBoxId, nextBoxId);
      }
    } catch (error) {
      console.error("Error updating item:", error);
      addToast(t('item.updateFailed'), "error");
    }
  };

  // Handle Tag Management. Tags are case-insensitive, so both operations act on
  // every stored spelling of the tag, not just the one the list happens to show.
  const handleRenameTag = async (oldName, newName) => {
    const canonical = normalizeTag(newName);
    const variants = tagVariants(allItems, oldName);
    const matches = new Set(variants.map(normalizeTag));
    await firebaseStorage.renameTag(variants, canonical);
    // Update local state for all items
    const updateItemTags = (item) => {
      if (!(item.tags || []).some(t => matches.has(normalizeTag(t)))) return item;
      return {
        ...item,
        tags: normalizeTags(item.tags.map(t => matches.has(normalizeTag(t)) ? canonical : t))
      };
    };
    setAllItems(prev => prev.map(updateItemTags));
    setItems(prev => prev.map(updateItemTags));

    // The filter pills may still point at the old name.
    const renamePill = (prev) => (matches.has(normalizeTag(prev)) ? canonical : prev);
    setSelectedTag(renamePill);
    setSelectedBoxTag(renamePill);
  };

  const handleDeleteTag = async (tagName) => {
    const variants = tagVariants(allItems, tagName);
    const matches = new Set(variants.map(normalizeTag));
    await firebaseStorage.deleteTag(variants);
    // Update local state for all items
    const removeItemTag = (item) => {
      if (!(item.tags || []).some(t => matches.has(normalizeTag(t)))) return item;
      return { ...item, tags: item.tags.filter(t => !matches.has(normalizeTag(t))) };
    };
    setAllItems(prev => prev.map(removeItemTag));
    setItems(prev => prev.map(removeItemTag));

    const clearPill = (prev) => (matches.has(normalizeTag(prev)) ? '' : prev);
    setSelectedTag(clearPill);
    setSelectedBoxTag(clearPill);
  };

  // Handle Select Existing Item
  const handleSelectExistingItem = async (itemId) => {
    if (!currentBox) return;

    try {
      const previousBoxId = findItemBoxId(itemId);

      // Update the item's boxId to the current box
      const updates = { boxId: currentBox.id };
      await firebaseStorage.updateItem(itemId, updates);

      // Both ends of the move changed contents.
      await touchBoxes(previousBoxId, currentBox.id);

      // Refresh data to show the updated item in the current box
      if (view === 'items') {
        const boxItems = await firebaseStorage.getItems(currentBox.id);
        setItems(boxItems);
      }
    } catch (err) {
      console.error('Failed to move item', err);
      addToast(t('item.moveFailed', { error: err.message }), "error");
    }
  };

  // No pull-to-refresh (the body disables overscroll for a native feel), so
  // this is the only way to pick up a change made on another device.
  const handleManualRefresh = async () => {
    const ok = await refreshData();
    if (ok) addToast(t('data.refreshed'), 'success');
  };

  const clearItemFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
  };

  const clearBoxFilters = () => {
    setBoxSearchQuery('');
    setSelectedBoxTag('');
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle Fullscreen Image. Receives image refs ({id?, thumb, full?}); the
  // viewer renders thumbs immediately and fetches full-res on demand.
  const handleImageClick = (refs, itemName, startIndex = 0) => {
    const list = Array.isArray(refs) ? refs : [refs];
    setFullscreenImage({ isOpen: true, refs: list, name: itemName, startIndex });
  };

  const handleCloseFullscreenImage = () => {
    setFullscreenImage({ isOpen: false, refs: [], name: '', startIndex: 0 });
  };

  // Data Import/Export Handlers
  const handleExportData = async () => {
    try {
      const boxesData = await firebaseStorage.getBoxes();
      const itemsData = await firebaseStorage.getAllItems();

      // Hydrate full-size images (now stored separately) back into each entity
      // so the backup is self-contained and restorable.
      const hydrate = async (entity) => {
        const refs = getImageRefs(entity);
        const images = await Promise.all(refs.map(async (r) => ({
          thumb: r.thumb,
          full: r.full || (r.id ? await firebaseStorage.getFullImage(r.id) : r.thumb),
        })));
        return { ...entity, images, image: images[0]?.thumb || null };
      };

      const backupData = {
        boxes: await Promise.all(boxesData.map(hydrate)),
        items: await Promise.all(itemsData.map(hydrate)),
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storage-box-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      addToast(t('export.failed'), "error");
    }
  };

  // Import and the image migration are the two operations that genuinely need
  // the server: they report progress against writes the server has taken, so
  // unlike an ordinary edit they cannot be queued and forgotten. Refuse them up
  // front rather than freeze a progress bar that will never move.
  const requireOnline = () => {
    if (isOffline) {
      addToast(t('data.needsConnection'), 'error');
      return false;
    }
    return true;
  };

  const handleImportButtonClick = () => {
    if (!requireOnline()) return;
    fileInputRef.current?.click();
  };

  // One-tap migration of any legacy inline images into the split thumb/full
  // layout. Safe to run repeatedly; already-optimised entities are skipped.
  const handleOptimizeImages = () => {
    if (!requireOnline()) return;
    askConfirm({
      title: t('optimize.confirmTitle'),
      message: t('optimize.confirmMessage'),
      type: 'primary',
      onConfirm: async () => {
        setImportState({ isImporting: true, progress: 0, phase: { key: 'import.phase.scanning' }, current: 0, total: 0 });
        try {
          const converted = await firebaseStorage.optimizeImages((p) => {
            setImportState(prev => ({ ...prev, progress: p.progress, phase: p.phase, current: p.current, total: p.total }));
          });
          setImportState(prev => ({ ...prev, isImporting: false }));
          addToast(converted > 0 ? t('optimize.done', { count: converted }) : t('optimize.alreadyDone'), 'success');
          refreshData();
        } catch (err) {
          console.error('Optimize images failed:', err);
          setImportState(prev => ({ ...prev, isImporting: false }));
          addToast(t('optimize.failed'), 'error');
        }
      }
    });
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.boxes || !data.items) {
          throw new Error(t('import.invalidFormat'));
        }

        setImportState({
          isImporting: true,
          progress: 0,
          phase: { key: 'import.phase.init' },
          current: 0,
          total: (data.boxes?.length || 0) + (data.items?.length || 0)
        });

        await firebaseStorage.importData(data, (p) => {
          setImportState(prev => ({
            ...prev,
            progress: p.progress,
            phase: p.phase,
            current: p.current
          }));
        });

        // Brief delay to show 100% completion
        setTimeout(() => {
          setImportState(prev => ({ ...prev, isImporting: false }));
          addToast(t('import.success'), "success");
          refreshData();
        }, 800);
      } catch (err) {
        console.error('Import failed:', err);
        addToast(t('import.failed', { error: err.message }), "error");
      }
    };

    askConfirm({
      title: t('import.confirmTitle'),
      message: t('import.confirmMessage'),
      type: 'primary',
      onConfirm: () => {
        reader.readAsText(file);
      }
    });

    event.target.value = ''; // Reset input
  };

  // Box Search Logic
  const filteredBoxes = useMemo(() => {
    let result = boxes;

    // Filter by tag
    if (selectedBoxTag) {
      result = result.filter(box => {
        // Find if this box has any items with the selected tag
        return allItems.some(item => item.boxId === box.id && hasTag(item, selectedBoxTag));
      });
    }

    // Filter by search query
    if (boxSearchQuery) {
      const fuse = new Fuse(result, {
        keys: ['name', 'description'],
        threshold: 0.3,
      });
      result = fuse.search(boxSearchQuery).map(r => r.item);
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (boxSortOrder) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
        case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
        default: return 0;
      }
    });

    return sorted;
  }, [boxes, boxSearchQuery, selectedBoxTag, boxSortOrder, allItems]);

  // Tapping a tag chip on a card filters by it — the shortest path from
  // "this looks relevant" to "show me everything like it".
  const handleTagClick = (tag) => {
    setSelectedTag(prev => (normalizeTag(prev) === normalizeTag(tag) ? '' : normalizeTag(tag)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Box Click from Search Results
  const handleBoxClickFromSearch = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (box) {
      handleBoxClick(box);
    }
  };

  // Compute all unique tags from all items (global). Normalised, so a legacy
  // "Books" and a current "books" collapse into a single entry.
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allItems.forEach(item => {
      normalizeTags(item.tags).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allItems]);

  // All Items View Filtering and Sorting
  const allItemsDisplayItems = useMemo(() => {
    if (view !== 'allItems') return [];

    const sorted = filterSortItems(items, {
      query: searchQuery,
      tag: selectedTag,
      sortOrder: itemSortOrder,
    });

    // Enrich with boxName for the footer row (Option C)
    return sorted.map(item => {
      if (!item.boxId) return { ...item, boxName: t('box.unassigned') };
      const box = boxes.find(b => b.id === item.boxId);
      return { ...item, boxName: box?.name || t('box.unknown') };
    });
  }, [items, selectedTag, searchQuery, itemSortOrder, view, boxes, t]);

  // Inside a box: the same search / sort / filter as everywhere else. This is
  // the list the box view actually renders — it used to render the raw `items`,
  // so the search field in there changed nothing at all.
  const boxViewItems = useMemo(() => {
    if (view !== 'items') return [];
    return filterSortItems(items, {
      query: searchQuery,
      tag: selectedTag,
      sortOrder: itemSortOrder,
    }).map(item => ({ ...item, boxName: currentBox?.name }));
  }, [view, items, searchQuery, selectedTag, itemSortOrder, currentBox?.name]);

  // Only the tags that occur in this box — offering the global list here would
  // mostly offer ways to empty the screen.
  const boxTags = useMemo(() => {
    if (view !== 'items') return [];
    const tagSet = new Set();
    items.forEach(item => normalizeTags(item.tags).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [view, items]);

  // Handle List All Items
  const handleListAllItems = async () => {
    setCurrentBox(null);
    const allItems = isMockAuth() ? MOCK_ITEMS : await firebaseStorage.getAllItems();
    const sortedItems = [...allItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setItems(sortedItems);
    setView('allItems');
    setSearchQuery('');
    setBoxSearchQuery('');
    setSelectedTag('');

    // Push to browser history
    window.history.pushState({ view: 'allItems' }, '', '#all-items');
  };

  if (introDone && user && accessDenied) {
    return <AccessPendingScreen user={user} onRecheck={refreshData} />;
  }

  const isBoxDetail = view === 'items' && !!currentBox;
  const boxImageRefs = currentBox ? getImageRefs(currentBox) : [];
  const boxMenuItems = currentBox ? [
    {
      id: 'edit',
      label: t('box.edit'),
      icon: <Edit size={18} />,
      onClick: () => handleEditBox(currentBox),
    },
    {
      id: 'remove',
      label: t('box.removeKeepItems'),
      icon: <LogOut size={18} />,
      onClick: () => handleRemoveBox(currentBox.id),
    },
    { id: 'divider', isDivider: true },
    {
      id: 'delete',
      label: t('box.deleteWithItems'),
      icon: <Trash2 size={18} />,
      danger: true,
      onClick: () => handleDeleteBox(currentBox.id),
    },
  ] : [];

  return (
    <div className="min-h-screen app-safe-bottom">
      <AnimatePresence>
        {!introDone && <AppIntro key="app-intro" />}
      </AnimatePresence>

      <AuthModal isOpen={!authLoading && !user} onClose={() => { }} />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />

      {/* Offline notice. Firestore keeps serving from its cache, so without this
          there is nothing to say the data on screen is not the server's. */}
      {isOffline && (
        <div className="app-safe-top">
          <div className="offline-bar">
            <WifiOff size={14} />
            {t('data.offline')}
          </div>
        </div>
      )}

      {/* Global Navigation Wrap — skipped in the box view, where the hero
          image owns the top of the screen. */}
      {!isBoxDetail && (
        <div className={`sticky top-0 z-40 bg-base/80 backdrop-blur-md border-b border-content/15 ${isOffline ? '' : 'app-safe-top'}`}>
          {/* Header. The signed-in address used to sit in a bar of its own
              across the top of every screen; it now lives in the settings menu,
              next to Sign out, and that row of chrome is gone. */}
          <header>
            <div className="container py-2.5">
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  onClick={handleBack}
                  title={t('nav.home')}
                >
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <PackageOpen size={22} />
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-base/40 p-1 rounded-xl flex-1 max-w-xs border border-content/25 backdrop-blur-xl shadow-lg ring-1 ring-content/5">
                  {[
                    { id: 'boxes', label: t('nav.boxes'), onClick: handleBack },
                    { id: 'allItems', label: t('nav.items'), onClick: handleListAllItems }
                  ].map(tab => {
                    const isActive = view === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={tab.onClick}
                        className={`flex-1 flex items-center justify-center py-2 px-3 text-sm font-semibold rounded-lg transition-colors duration-300 relative ${isActive ? 'text-primary' : 'text-muted hover:text-content/90'}`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 bg-primary/15 rounded-lg border border-primary/20 shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.2)]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {user && (
                  <SettingsMenu
                    email={user.email}
                    onRefresh={handleManualRefresh}
                    onManageTags={() => setIsTagManagementModalOpen(true)}
                    onExport={handleExportData}
                    onImport={handleImportButtonClick}
                    onOptimizeImages={handleOptimizeImages}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    onCheckUpdates={handleCheckForUpdates}
                    onAbout={() => setIsAboutModalOpen(true)}
                    onSignOut={handleSignOut}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Sticky find bar: search + sort + filter. Search belongs here —
              it is the primary way of finding anything, and it used to be the
              one control that scrolled away while sort stayed pinned. */}
          {user && (view === 'boxes' || view === 'allItems') && (
            <div className="sfb-wrapper border-t border-content/15">
              <div className="sfb-wrapper__inner">
                <SortFilterBar
                  sortOrder={view === 'boxes' ? boxSortOrder : itemSortOrder}
                  onSortChange={view === 'boxes' ? setBoxSortOrder : setItemSortOrder}
                  selectedTag={view === 'boxes' ? selectedBoxTag : selectedTag}
                  onTagChange={view === 'boxes' ? setSelectedBoxTag : setSelectedTag}
                  tags={allTags}
                  searchValue={view === 'boxes' ? boxSearchQuery : searchQuery}
                  onSearchChange={view === 'boxes' ? setBoxSearchQuery : setSearchQuery}
                  searchPlaceholder={view === 'boxes' ? t('box.search') : t('item.searchAll')}
                  filterTitle={view === 'boxes' ? t('tags.boxFilterTitle') : t('tags.itemFilterTitle')}
                  specialOptions={view === 'allItems'
                    ? [{ value: UNASSIGNED_FILTER, label: t('box.unassignedFilter') }]
                    : []}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Box view top bar: a full-bleed hero image with the back button and the
          box actions floating on it — or, with no photo, a plain compact bar. */}
      {isBoxDetail && (
        boxImageRefs.length > 0 ? (
          <div className={`bg-base ${isOffline ? '' : 'app-safe-top'}`} ref={heroRef}>
            {/* 32vh, not 42vh: at 42 the first item was a single clipped row of
                photo with its name below the fold, on a screen you opened in
                order to see what is in the box. */}
            <div className="relative w-full h-[32vh] min-h-[180px] max-h-[360px] bg-surface overflow-hidden">
              <ImageSlider
                images={refsToThumbs(boxImageRefs)}
                alt={currentBox.name}
                onImageClick={(_images, _alt, index) => handleImageClick(boxImageRefs, currentBox.name, index)}
                className="w-full h-full"
                fit="cover"
                variant="overlay"
              />
              {/* Scrim: keeps the floating controls readable on light photos */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <button onClick={handleBack} className="hero-btn" aria-label={t('nav.back')} title={t('nav.back')}>
                  <ArrowLeft size={22} />
                </button>
                <OverflowMenu label={t('box.actions')} buttonClassName="hero-btn" items={boxMenuItems} />
              </div>
            </div>
          </div>
        ) : (
          <div className={`sticky top-0 z-40 bg-base/80 backdrop-blur-md border-b border-content/15 ${isOffline ? '' : 'app-safe-top'}`}>
            <div className="container py-2 flex items-center gap-2">
              <button onClick={handleBack} className="p-2.5 rounded-lg hover:bg-elevated text-muted hover:text-content transition-colors shrink-0" aria-label={t('nav.back')}>
                <ArrowLeft size={22} />
              </button>
              <h1 className="flex-1 min-w-0 text-lg font-semibold text-content truncate">{currentBox.name}</h1>
              <OverflowMenu label={t('box.actions')} items={boxMenuItems} />
            </div>
          </div>
        )
      )}

      {/* The hero collapses into this once it scrolls away, so Back and the box
          actions never leave the screen. */}
      <AnimatePresence>
        {isBoxDetail && boxImageRefs.length > 0 && heroHidden && (
          <motion.div
            key="box-bar"
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="box-bar"
          >
            <div className="box-bar__inner">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg text-muted hover:text-content hover:bg-elevated transition-colors shrink-0"
                aria-label={t('nav.back')}
                title={t('nav.back')}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="flex-1 min-w-0 text-sm font-semibold text-content truncate">{currentBox.name}</h2>
              <OverflowMenu label={t('box.actions')} items={boxMenuItems} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`container animate-fade-in ${isBoxDetail ? 'pt-4 pb-8' : 'py-6'}`}>

        {/* Box List View */}
        {view === 'boxes' && (
          <>
            {/* Title + count */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-content">{t('box.title')}</h2>
              <span className="text-muted text-sm">{t('box.count', { count: filteredBoxes.length })}</span>
            </div>

            {dataLoading && boxes.length === 0 ? (
              <SkeletonGrid count={6} />
            ) : boxes.length === 0 ? (
              <EmptyState
                icon={<PackageOpen size={28} />}
                title={t('box.emptyTitle')}
                hint={t('box.emptyHint')}
                actionLabel={t('box.createFirst')}
                actionIcon={<Plus size={18} />}
                onAction={() => setIsAddBoxModalOpen(true)}
              />
            ) : filteredBoxes.length === 0 ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title={boxSearchQuery ? t('search.noMatchFor', { query: boxSearchQuery }) : t('search.noMatch')}
                hint={t('search.noMatchHint')}
                actionLabel={t('search.clearFilters')}
                onAction={clearBoxFilters}
              />
            ) : (
              <BoxList
                boxes={filteredBoxes}
                allItems={allItems}
                onBoxClick={handleBoxClick}
                onImageClick={handleImageClick}
              />
            )}
          </>
        )}

        {/* Box View (Inside Box) */}
        {view === 'items' && currentBox && (
          <>
            {/* Box Header — the image and the actions menu live in the hero
                above; this is just the text block. */}
            <div className="mb-4 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div
                      onClick={() => handleEditBox(currentBox)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditBox(currentBox); } }}
                      role="button"
                      tabIndex={0}
                      className="flex-1 min-w-0 cursor-pointer rounded-2xl -mx-2 -mt-2 px-2 pt-2 hover:bg-primary/10 transition-colors"
                      title={t('box.edit')}
                      aria-label={t('box.editAria', { name: currentBox.name })}
                    >
                      <div className="flex items-start gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-content tracking-tight">{currentBox.name}</h1>
                        {/* Permanent, not hover-revealed: on Android the hover
                            tint that used to be the only hint never appears. */}
                        <span className="edit-hint mt-1.5" aria-hidden="true">
                          <Pencil size={16} />
                        </span>
                      </div>
                      <p className="text-muted text-sm leading-relaxed mt-2 max-w-3xl">{currentBox.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted">
                    {/* Last contents change is the useful date here; fall back to
                        creation for boxes nobody has touched since packing. */}
                    <span className="bg-surface/50 px-3 py-1.5 rounded-full border border-content/15 flex items-center gap-1.5">
                      {currentBox.updatedAt ? (
                        <>
                          <History size={14} className="opacity-60" />
                          {t('box.updatedOn', { date: formatDate(currentBox.updatedAt) })}
                        </>
                      ) : (
                        <>
                          <Calendar size={14} className="opacity-60" />
                          {t('box.createdOn', { date: formatDate(currentBox.createdAt) })}
                        </>
                      )}
                    </span>
                    <span className="bg-surface/50 px-3 py-1.5 rounded-full border border-content/15 flex items-center gap-1.5">
                      <Package size={14} className="opacity-60" />
                      {t('item.count', { count: items.length })}
                    </span>
                  </div>
                </div>
              </div>
            </div>



            {/* Find bar inside the box. Sticks below the collapsed header, so
                sorting a 40-item box no longer means scrolling back to the top.
                `top` matches .box-bar__inner's height. */}
            {items.length > 0 && (
              <div
                className="sfb-wrapper -mx-4 mb-4 border-y border-content/10"
                style={{ top: `calc(env(safe-area-inset-top, 0px) + ${boxImageRefs.length > 0 ? '3rem + 1px' : '0px'})` }}
              >
                <div className="sfb-wrapper__inner">
                  <SortFilterBar
                    sortOrder={itemSortOrder}
                    onSortChange={setItemSortOrder}
                    selectedTag={selectedTag}
                    onTagChange={setSelectedTag}
                    tags={boxTags}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t('item.searchInBox')}
                    filterTitle={t('tags.itemFilterTitle')}
                  />
                </div>
              </div>
            )}

            {/* Items Grid */}
            {items.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title={t('item.emptyTitle')}
                hint={t('item.emptyHint')}
                actionLabel={t('item.add')}
                actionIcon={<Plus size={18} />}
                onAction={() => setIsAddItemModalOpen(true)}
              />
            ) : boxViewItems.length === 0 ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title={searchQuery ? t('search.noMatchFor', { query: searchQuery }) : t('search.noMatch')}
                hint={t('search.noMatchHint')}
                actionLabel={t('search.clearFilters')}
                onAction={clearItemFilters}
              />
            ) : (
              <ItemList
                items={boxViewItems}
                onDeleteItem={handleDeleteItem}
                onRemoveFromBox={handleRemoveItemFromBox}
                onEditItem={handleEditItem}
                onImageClick={handleImageClick}
                onTagClick={handleTagClick}
                showItemNavigation={true}
              />
            )}
          </>
        )}

        {/* All Items View */}
        {view === 'allItems' && (
          <>
            {/* Title + count */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-content">{t('item.title')}</h2>
              <span className="text-muted text-sm">{t('item.count', { count: allItemsDisplayItems.length })}</span>
            </div>
            {dataLoading && items.length === 0 ? (
              <SkeletonGrid count={6} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title={t('item.emptyAllTitle')}
                hint={t('item.emptyAllHint')}
                actionLabel={t('item.add')}
                actionIcon={<Plus size={18} />}
                onAction={() => setIsAddItemModalOpen(true)}
              />
            ) : allItemsDisplayItems.length === 0 ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title={searchQuery ? t('search.noMatchFor', { query: searchQuery }) : t('search.noMatch')}
                hint={t('search.noMatchHint')}
                actionLabel={t('search.clearFilters')}
                onAction={clearItemFilters}
              />
            ) : (
              <ItemList
                items={allItemsDisplayItems}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
                onBoxClick={handleBoxClickFromSearch}
                onImageClick={handleImageClick}
                onTagClick={handleTagClick}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AddBoxModal
        isOpen={isAddBoxModalOpen}
        onClose={() => setIsAddBoxModalOpen(false)}
        onAdd={handleAddBox}
        askConfirm={askConfirm}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onAdd={handleAddItem}
        boxes={boxes}
        initialBoxId={currentBox?.id}
        availableItems={allItems}
        availableTags={allTags}
        onSelectExisting={handleSelectExistingItem}
        askConfirm={askConfirm}
      />

      <EditBoxModal
        isOpen={!!editingBox}
        onClose={() => setEditingBox(null)}
        onSave={handleUpdateBox}
        box={editingBox}
        askConfirm={askConfirm}
      />

      <EditItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        item={editingItem}
        boxes={boxes}
        availableTags={allTags}
        askConfirm={askConfirm}
      />

      <FullscreenImageModal
        isOpen={fullscreenImage.isOpen}
        onClose={handleCloseFullscreenImage}
        imageRefs={fullscreenImage.refs}
        itemName={fullscreenImage.name}
        startIndex={fullscreenImage.startIndex}
      />
      <TagManagementModal
        isOpen={isTagManagementModalOpen}
        onClose={() => setIsTagManagementModalOpen(false)}
        allItems={allItems}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
        addToast={addToast}
        askConfirm={askConfirm}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
      />

      {/* Notifications and Dialogs */}
      <ImportProgressModal
        isOpen={importState.isImporting}
        progress={importState.progress}
        phase={importState.phase}
        current={importState.current}
        total={importState.total}
      />

      {/* One live region for every notification — screen readers announced
          nothing at all before. */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none w-full max-w-md"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              actionLabel={toast.actionLabel}
              onAction={toast.onAction ? () => { toast.onAction(); removeToast(toast.id); } : undefined}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Action Button (FAB) */}
      <AnimatePresence>
        {user && (view === 'boxes' || view === 'allItems' || (view === 'items' && items.length > 0)) && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (view === 'boxes') {
                setIsAddBoxModalOpen(true);
              } else {
                setIsAddItemModalOpen(true);
              }
            }}
            className="fab-btn"
            title={view === 'boxes' ? t('box.add') : t('item.add')}
            aria-label={view === 'boxes' ? t('box.add') : t('item.add')}
          >
            <Plus size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        type={confirmDialog.type}
      />
    </div >
  );
}

export default App;
