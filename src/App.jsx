import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { BoxList } from './components/BoxList';
import { ItemList } from './components/ItemList';
import { AddBoxModal } from './components/AddBoxModal';
import { AddItemModal } from './components/AddItemModal';
import { EditBoxModal } from './components/EditBoxModal';
import { EditItemModal } from './components/EditItemModal';
import { SearchBar } from './components/SearchBar';
import { AuthModal } from './components/AuthModal';
import { FullscreenImageModal } from './components/FullscreenImageModal';
import { ImageSlider } from './components/ImageSlider';
import { TagManagementModal } from './components/TagManagementModal';
import { SettingsMenu } from './components/SettingsMenu';
import { OverflowMenu } from './components/OverflowMenu';
import { ImportProgressModal } from './components/ImportProgressModal';
import { Toast } from './components/Toast';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { ArrowLeft, PackageOpen, LogOut, Package, Edit, Trash2, Calendar, History, Plus } from 'lucide-react';
import { firebaseStorage } from './services/firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { formatDate } from './utils/dateUtils';
import { getImageRefs, refsToThumbs, makeDerivatives } from './utils/imageUtils';
import { SortFilterBar } from './components/SortFilterBar';
import { checkForUpdate, applyUpdate } from './native/updates';
import { v4 as uuidv4 } from 'uuid';
import { loadDraft, saveDraft, clearDraft } from './utils/draftStorage';

const MOCK_BOXES = [
  {
    id: "mock-box-1",
    name: "Mock Box 1",
    description: "A test storage box for visual inspection",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233b82f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='10'>Box 1 Image</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233b82f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='10'>Box 1 Image</text></svg>"],
    userId: "mock-user-123",
    createdAt: Date.now()
  }
];

const MOCK_ITEMS = [
  {
    id: "mock-item-1",
    name: "Mock Item 1",
    description: "A test item with an image",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2310b981'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='10'>Item 1 Image</text></svg>",
    images: ["data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2310b981'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='10'>Item 1 Image</text></svg>"],
    boxId: "mock-box-1",
    userId: "mock-user-123",
    createdAt: Date.now(),
    tags: ["test"]
  }
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [fullscreenImage, setFullscreenImage] = useState({ isOpen: false, refs: [], name: '' });
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  });
  const fileInputRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setHeaderHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(([entry]) =>
      setHeaderHeight(entry.contentRect.height)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Notification Helpers
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const askConfirm = (options) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title || 'Are you sure?',
      message: options.message || '',
      type: options.type || 'danger',
      onConfirm: options.onConfirm
    });
  };

  // Check the live deployment for a newer build and offer to reload into it.
  const handleCheckForUpdates = async () => {
    addToast('Checking for updates…', 'info');
    try {
      const { updateAvailable } = await checkForUpdate();
      if (updateAvailable) {
        askConfirm({
          title: 'Update available',
          message: 'A new version is ready. Reload now to update?',
          type: 'primary',
          onConfirm: applyUpdate
        });
      } else {
        addToast("You're on the latest version", 'success');
      }
    } catch {
      addToast('Could not check for updates. Check your connection.', 'error');
    }
  };

  // Auth Listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock-auth') === 'true') {
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

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setBoxes([]);
      setItems([]);
      setAllItems([]);
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
          if (user) {
            const loadedBoxes = await firebaseStorage.getBoxes();
            setBoxes(loadedBoxes);
            const allItems = await firebaseStorage.getAllItems();
            setItems(allItems);
          }
        } else if (historyView === 'items' && boxId) {
          const box = boxes.find(b => b.id === boxId) || { id: boxId, name: boxName };
          setCurrentBox(box);
          const boxItems = await firebaseStorage.getItems(boxId);
          setItems(boxItems);
          setView('items');
          setSearchQuery('');
          setBoxSearchQuery('');
        } else if (historyView === 'allItems') {
          setCurrentBox(null);
          const allItems = await firebaseStorage.getAllItems();
          setItems(allItems);
          setView('allItems');
          setSearchQuery('');
          setBoxSearchQuery('');
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

  const refreshData = async () => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock-auth') === 'true') {
      setBoxes(MOCK_BOXES);
      setAllItems(MOCK_ITEMS);
      if (currentBox) {
        setItems(MOCK_ITEMS.filter(i => i.boxId === currentBox.id));
      } else {
        setItems(MOCK_ITEMS);
      }
      return;
    }

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
  };

  // Handle Box Selection
  const handleBoxClick = async (box) => {
    setCurrentBox(box);
    const params = new URLSearchParams(window.location.search);
    let boxItems = [];
    if (params.get('mock-auth') === 'true') {
      boxItems = MOCK_ITEMS.filter(i => i.boxId === box.id);
    } else {
      boxItems = await firebaseStorage.getItems(box.id);
    }
    const sortedItems = [...boxItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setItems(sortedItems);
    setView('items');
    setSearchQuery('');
    setBoxSearchQuery('');

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
      addToast("Failed to add box. Please try again.", "error");
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
      addToast("Failed to add item. Please try again.", "error");
    }
  };

  // Remove an item from its box without deleting it (it stays in "All Items").
  const handleRemoveItemFromBox = async (itemId) => {
    askConfirm({
      title: 'Remove from Box?',
      message: 'Remove this item from the box? (It will remain in "All Items")',
      type: 'primary',
      onConfirm: async () => {
        const previousBoxId = findItemBoxId(itemId);

        // Optimistic update - remove from current view
        setItems(prev => prev.filter(i => i.id !== itemId));

        try {
          await firebaseStorage.updateItem(itemId, { boxId: '' });
          // Update allItems to reflect the change
          setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, boxId: '' } : i));
          await touchBoxes(previousBoxId);
          addToast("Item removed from box", "success");
        } catch (err) {
          console.error('Failed to remove item from box', err);
          refreshData(); // Revert on error
          addToast("Failed to remove item from box", "error");
        }
      }
    });
  };

  // Permanently delete an item (available from both the box view and All Items).
  const handleDeleteItem = async (itemId) => {
    askConfirm({
      title: 'Delete Item?',
      message: 'Are you sure you want to PERMANENTLY delete this item?',
      type: 'danger',
      onConfirm: async () => {
        const previousBoxId = findItemBoxId(itemId);

        // Optimistic update
        setItems(prev => prev.filter(i => i.id !== itemId));
        setAllItems(prev => prev.filter(i => i.id !== itemId));

        try {
          await firebaseStorage.deleteItem(itemId);
          await touchBoxes(previousBoxId);
          addToast("Item deleted permanently", "success");
        } catch (err) {
          console.error('Failed to delete item', err);
          refreshData(); // Revert on error
          addToast("Failed to delete item", "error");
        }
      }
    });
  };

  async function handleDeleteBox(id) {
    askConfirm({
      title: 'Delete Box?',
      message: 'Are you sure you want to delete this box and all its items?',
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
          addToast("Box and contents deleted", "success");
        } catch (err) {
          console.error('Failed to delete box', err);
          refreshData(); // Revert
          addToast("Failed to delete box", "error");
        }
      }
    });
  };

  async function handleRemoveBox(id) {
    askConfirm({
      title: 'Remove Box?',
      message: 'Are you sure you want to remove this box? Items will be moved to "Unassigned".',
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
          addToast("Box removed; items unassigned", "success");
        } catch (err) {
          console.error('Failed to remove box', err);
          refreshData(); // Revert
          addToast("Failed to remove box", "error");
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
      addToast('Failed to update box: ' + err.message, "error");
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
      addToast("Failed to update item. Please try again.", "error");
    }
  };

  // Handle Tag Management
  const handleRenameTag = async (oldName, newName) => {
    await firebaseStorage.renameTag(oldName, newName);
    // Update local state for all items
    const updateItemTags = (item) => {
      if (item.tags && item.tags.includes(oldName)) {
        return { ...item, tags: item.tags.map(t => t === oldName ? newName : t) };
      }
      return item;
    };
    setAllItems(prev => prev.map(updateItemTags));
    setItems(prev => prev.map(updateItemTags));
  };

  const handleDeleteTag = async (tagName) => {
    await firebaseStorage.deleteTag(tagName);
    // Update local state for all items
    const removeItemTag = (item) => {
      if (item.tags && item.tags.includes(tagName)) {
        return { ...item, tags: item.tags.filter(t => t !== tagName) };
      }
      return item;
    };
    setAllItems(prev => prev.map(removeItemTag));
    setItems(prev => prev.map(removeItemTag));
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
      addToast('Failed to move item: ' + err.message, "error");
    }
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
  const handleImageClick = (refs, itemName) => {
    const list = Array.isArray(refs) ? refs : [refs];
    setFullscreenImage({ isOpen: true, refs: list, name: itemName });
  };

  const handleCloseFullscreenImage = () => {
    setFullscreenImage({ isOpen: false, refs: [], name: '' });
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
      addToast('Failed to export data', "error");
    }
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  // One-tap migration of any legacy inline images into the split thumb/full
  // layout. Safe to run repeatedly; already-optimised entities are skipped.
  const handleOptimizeImages = () => {
    askConfirm({
      title: 'Optimize images?',
      message: 'This converts older photos to the faster thumbnail + on-demand format. It may take a moment and is safe to run again later.',
      type: 'primary',
      onConfirm: async () => {
        setImportState({ isImporting: true, progress: 0, phase: 'Scanning…', current: 0, total: 0 });
        try {
          const converted = await firebaseStorage.optimizeImages((p) => {
            setImportState(prev => ({ ...prev, progress: p.progress, phase: p.phase, current: p.current, total: p.total }));
          });
          setImportState(prev => ({ ...prev, isImporting: false }));
          addToast(converted > 0 ? `Optimized ${converted} item${converted === 1 ? '' : 's'}` : 'Everything is already optimized', 'success');
          refreshData();
        } catch (err) {
          console.error('Optimize images failed:', err);
          setImportState(prev => ({ ...prev, isImporting: false }));
          addToast('Failed to optimize images', 'error');
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
          throw new Error('Invalid backup format');
        }

        setImportState({
          isImporting: true,
          progress: 0,
          phase: 'Initializing...',
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
          addToast('Data imported successfully!', "success");
          refreshData();
        }, 800);
      } catch (err) {
        console.error('Import failed:', err);
        addToast('Failed to import data: ' + err.message, "error");
      }
    };

    askConfirm({
      title: 'Import Backup?',
      message: 'This will import data from the backup. Fresh copies of all items and boxes will be created in your account. Proceed?',
      type: 'primary',
      onConfirm: () => {
        reader.readAsText(file);
      }
    });

    event.target.value = ''; // Reset input
  };

  // Fuzzy Search Logic
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const fuse = new Fuse(items, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map(result => result.item);
  }, [items, searchQuery]);

  // Box Search Logic
  const filteredBoxes = useMemo(() => {
    let result = boxes;

    // Filter by tag
    if (selectedBoxTag) {
      result = result.filter(box => {
        // Find if this box has any items with the selected tag
        return allItems.some(item => item.boxId === box.id && item.tags && item.tags.includes(selectedBoxTag));
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

  // Global Search
  const globalSearchResults = useMemo(() => {
    if (view !== 'boxes' || !searchQuery) return [];

    const allItems = items;
    const fuse = new Fuse(allItems, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery).map(result => result.item);

    return results.map(item => {
      if (!item.boxId) return { ...item, boxName: 'Unassigned' };
      const box = boxes.find(b => b.id === item.boxId);
      return { ...item, boxName: box?.name || 'Unknown Box' };
    });
  }, [view, searchQuery, boxes, items]);

  // Handle Box Click from Search Results
  const handleBoxClickFromSearch = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (box) {
      handleBoxClick(box);
    }
  };

  // Compute all unique tags from all items (global)
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allItems]);

  // All Items View Filtering and Sorting
  const allItemsDisplayItems = useMemo(() => {
    if (view !== 'allItems') return [];

    let result = items;

    // Filter by tag
    if (selectedTag) {
      result = result.filter(item =>
        item.tags && item.tags.includes(selectedTag)
      );
    }

    // Filter by search query
    if (searchQuery) {
      const fuse = new Fuse(result, {
        keys: ['name', 'description', 'tags'],
        threshold: 0.3,
      });
      result = fuse.search(searchQuery).map(r => r.item);
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (itemSortOrder) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
        case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
        default: return 0;
      }
    });

    // Enrich with boxName for the footer row (Option C)
    return sorted.map(item => {
      if (!item.boxId) return { ...item, boxName: 'Unassigned' };
      const box = boxes.find(b => b.id === item.boxId);
      return { ...item, boxName: box?.name || 'Unknown Box' };
    });
  }, [items, selectedTag, searchQuery, itemSortOrder, view, boxes]);

  // Handle List All Items
  const handleListAllItems = async () => {
    setCurrentBox(null);
    const allItems = await firebaseStorage.getAllItems();
    const sortedItems = [...allItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setItems(sortedItems);
    setView('allItems');
    setSearchQuery('');
    setBoxSearchQuery('');
    setSelectedTag('');

    // Push to browser history
    window.history.pushState({ view: 'allItems' }, '', '#all-items');
  };

  const displayItems = (view === 'items' || view === 'allItems') ? filteredItems : globalSearchResults;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-safe-bottom">
      <AuthModal isOpen={!user} onClose={() => { }} />

      {/* Global Navigation Wrap */}
      <div className="sticky top-0 z-40 app-safe-top bg-base/80 backdrop-blur-md border-b border-content/15">
        {/* Header */}
        <header ref={headerRef}>
          {/* Top Bar - User Info */}
          {user && (
            <div className="bg-base/50 border-b border-content/15 py-1.5 px-4">
              <div className="container flex justify-end items-center gap-3">
                <span className="text-xs text-muted">Signed in as <span className="text-content font-medium ml-1">{user.email}</span></span>
                <SettingsMenu
                  onManageTags={() => setIsTagManagementModalOpen(true)}
                  onExport={handleExportData}
                  onImport={handleImportButtonClick}
                  onOptimizeImages={handleOptimizeImages}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onCheckUpdates={handleCheckForUpdates}
                  onSignOut={handleSignOut}
                />
              </div>
            </div>
          )}

          <div className="container py-3">
            <div className="flex items-center gap-4">
              {/* Back button - only when inside a box */}
              {view === 'items' && (
                <button onClick={handleBack} className="p-2.5 rounded-lg hover:bg-elevated text-muted hover:text-content transition-colors shrink-0" aria-label="Back to boxes">
                  <ArrowLeft size={22} />
                </button>
              )}

              {/* Logo */}
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                onClick={handleBack}
                title="Go to Home"
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <PackageOpen size={22} />
                </div>
                {view === 'items' && (
                  <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-content to-muted">
                    {currentBox?.name}
                  </h1>
                )}
              </div>

              {/* Tab Switcher in header — only on top-level views */}
              {!currentBox && (
                <div className="flex bg-base/40 p-1 rounded-xl flex-1 max-w-xs border border-content/25 backdrop-blur-xl shadow-lg ring-1 ring-content/5">
                  {[
                    { id: 'boxes', label: 'Boxes', onClick: handleBack },
                    { id: 'allItems', label: 'Items', onClick: handleListAllItems }
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
              )}

            </div>
          </div>
        </header>

        {/* Sticky Sort / Filter bar */}
        {user && (view === 'boxes' || view === 'allItems') && (
          <div className="sfb-wrapper border-t border-content/15">
            <div className="sfb-wrapper__inner">
              <SortFilterBar
                sortOrder={view === 'boxes' ? boxSortOrder : itemSortOrder}
                onSortChange={view === 'boxes' ? setBoxSortOrder : setItemSortOrder}
                selectedTag={view === 'boxes' ? selectedBoxTag : selectedTag}
                onTagChange={view === 'boxes' ? setSelectedBoxTag : setSelectedTag}
                tags={allTags}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="container py-8 animate-fade-in">

        {/* Box List View */}
        {view === 'boxes' && (
          <>
            {/* Title + count */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-content">Boxes</h2>
              <span className="text-muted text-sm">{filteredBoxes.length} boxes</span>
            </div>
            {/* Search */}
            <div className="mb-6">
              <SearchBar
                value={boxSearchQuery}
                onChange={setBoxSearchQuery}
                placeholder="Search your boxes..."
              />
            </div>

            <BoxList
              boxes={filteredBoxes}
              allItems={allItems}
              onBoxClick={handleBoxClick}
              onImageClick={handleImageClick}
            />
          </>
        )}

        {/* Box View (Inside Box) */}
        {view === 'items' && currentBox && (
          <>
            {/* Box Header */}
            <div className="mb-8 animate-fade-in">
              {/* Image Banner */}
              <div className="w-full h-48 md:h-64 bg-surface rounded-3xl shadow-2xl border border-border/50 overflow-hidden relative mb-6 group">
                <ImageSlider
                  images={refsToThumbs(getImageRefs(currentBox))}
                  alt={currentBox.name}
                  onImageClick={() => handleImageClick(getImageRefs(currentBox), currentBox.name)}
                  className="w-full h-full"
                  fit="cover"
                />
                {getImageRefs(currentBox).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-content/40">
                    <Package size={64} />
                  </div>
                )}
                {/* Visual gradient overlay to make the banner feel more integrated */}
                <div className="absolute inset-0 bg-gradient-to-t from-base/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Box Info Row */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div
                      onClick={() => handleEditBox(currentBox)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditBox(currentBox); } }}
                      role="button"
                      tabIndex={0}
                      className="flex-1 min-w-0 cursor-pointer rounded-2xl -mx-2 -mt-2 px-2 pt-2 hover:bg-primary/10 transition-colors"
                      title="Edit Box"
                      aria-label={`Edit ${currentBox.name}`}
                    >
                      <h1 className="text-2xl md:text-3xl font-bold text-content tracking-tight">{currentBox.name}</h1>
                      <p className="text-muted text-sm leading-relaxed mt-2 max-w-3xl">{currentBox.description}</p>
                    </div>
                    <div className="shrink-0">
                      <OverflowMenu
                        label="Box actions"
                        items={[
                          {
                            id: 'edit',
                            label: 'Edit Box',
                            icon: <Edit size={18} />,
                            onClick: () => handleEditBox(currentBox),
                          },
                          {
                            id: 'remove',
                            label: 'Remove (keep items)',
                            icon: <LogOut size={18} />,
                            onClick: () => handleRemoveBox(currentBox.id),
                          },
                          { id: 'divider', isDivider: true },
                          {
                            id: 'delete',
                            label: 'Delete Box & Items',
                            icon: <Trash2 size={18} />,
                            danger: true,
                            onClick: () => handleDeleteBox(currentBox.id),
                          },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted">
                    {/* Last contents change is the useful date here; fall back to
                        creation for boxes nobody has touched since packing. */}
                    <span className="bg-surface/50 px-3 py-1.5 rounded-full border border-content/15 flex items-center gap-1.5">
                      {currentBox.updatedAt ? (
                        <>
                          <History size={14} className="opacity-60" />
                          Updated: {formatDate(currentBox.updatedAt)}
                        </>
                      ) : (
                        <>
                          <Calendar size={14} className="opacity-60" />
                          Created: {formatDate(currentBox.createdAt)}
                        </>
                      )}
                    </span>
                    <span className="bg-surface/50 px-3 py-1.5 rounded-full border border-content/15 flex items-center gap-1.5">
                      <Package size={14} className="opacity-60" />
                      {items.length} items
                    </span>
                  </div>
                </div>
              </div>
            </div>



            {/* Search within this box */}
            {items.length > 0 && (
              <div className="mb-6">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search in this box..."
                />
              </div>
            )}

            {/* Items Grid */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="p-4 rounded-full bg-surface/60 mb-4">
                  <Package size={28} className="text-muted" />
                </div>
                <p className="text-muted text-lg font-medium">No items in this box yet</p>
                <p className="text-content/50 text-sm mt-1 mb-5">Add your first item to start tracking what's inside.</p>
                <button
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  Add item
                </button>
              </div>
            ) : (
              <ItemList
                items={items.map(item => ({ ...item, boxName: currentBox?.name }))}
                onDeleteItem={handleDeleteItem}
                onRemoveFromBox={handleRemoveItemFromBox}
                onEditItem={handleEditItem}
                onImageClick={handleImageClick}
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
              <h2 className="text-lg font-semibold text-content">Items</h2>
              <span className="text-muted text-sm">{allItemsDisplayItems.length} items</span>
            </div>
            {/* Search */}
            <div className="mb-6">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search all items..."
              />
            </div>

            <ItemList
              items={allItemsDisplayItems}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onBoxClick={handleBoxClickFromSearch}
              onImageClick={handleImageClick}
            />
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

      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>

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
            title={view === 'boxes' ? "Add Box" : "Add Item"}
            aria-label={view === 'boxes' ? "Add Box" : "Add Item"}
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
