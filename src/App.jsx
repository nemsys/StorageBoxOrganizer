import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
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
import { ArrowLeft, PackageOpen, LogOut, User, Filter, ArrowUpDown, Package, Edit, Trash2, Calendar, Tags } from 'lucide-react';
import { firebaseStorage } from './services/firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { formatDate } from './utils/dateUtils';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('boxes'); // 'boxes' | 'items' | 'allItems'
  const [currentBox, setCurrentBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // All items for selection
  const [searchQuery, setSearchQuery] = useState('');
  const [boxSearchQuery, setBoxSearchQuery] = useState('');

  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [editingItem, setEditingItem] = useState(null);


  const [itemSortOrder, setItemSortOrder] = useState('newest'); // 'name-asc', 'name-desc', 'newest', 'oldest'
  const [selectedTag, setSelectedTag] = useState('');
  
  const [boxSortOrder, setBoxSortOrder] = useState('newest');
  const [selectedBoxTag, setSelectedBoxTag] = useState('');

  const [isTagManagementModalOpen, setIsTagManagementModalOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState({ isOpen: false, url: '', name: '' });

  // Auth Listener
  useEffect(() => {
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
      window.history.replaceState({ view: 'boxes' }, '', window.location.pathname);
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

  const refreshData = async () => {
    if (!user) return;
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
    const boxItems = await firebaseStorage.getItems(box.id);
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

  // Handle Adding Box
  // Handle Adding Box
  const handleAddBox = async (payload) => {
    try {
      let imageUrls = [];
      if (payload.images && payload.images.length > 0) {
        // Upload all images
        const uploadPromises = payload.images.map(image =>
          firebaseStorage.uploadImage(image, 'boxes')
        );
        imageUrls = await Promise.all(uploadPromises);
      }

      const newBox = {
        id: Date.now().toString(),
        name: payload.name,
        description: payload.description,
        images: imageUrls,
        image: imageUrls.length > 0 ? imageUrls[0] : null, // Backward compatibility
        createdAt: Date.now()
      };
      // Persist to Firebase
      const savedBox = await firebaseStorage.addBox(newBox);

      setBoxes(prev => [savedBox, ...prev]);
      setIsAddBoxModalOpen(false);
    } catch (error) {
      console.error("Error adding box:", error);
      alert("Failed to add box. Please try again.");
    }
  };

  // Handle Adding Item
  const handleAddItem = async (payload) => {
    try {
      let imageUrls = [];
      if (payload.images && payload.images.length > 0) {
        // Upload all images
        const uploadPromises = payload.images.map(image =>
          firebaseStorage.uploadImage(image, 'items')
        );
        imageUrls = await Promise.all(uploadPromises);
      }

      const newItem = {
        id: Date.now().toString(),
        name: payload.name,
        description: payload.description,
        images: imageUrls,
        image: imageUrls.length > 0 ? imageUrls[0] : null, // Backward compatibility
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
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item. Please try again.");
    }
  };

  // Handle Deleting Item
  const handleDeleteItem = async (itemId) => {
    if (currentBox) {
      // If in a box, just remove from box (unassign)
      if (confirm('Remove this item from the box? (It will remain in "All Items")')) {
        // Optimistic update - remove from current view
        setItems(prev => prev.filter(i => i.id !== itemId));

        try {
          await firebaseStorage.updateItem(itemId, { boxId: '' });
          // Update allItems to reflect the change
          setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, boxId: '' } : i));
        } catch (err) {
          console.error('Failed to remove item from box', err);
          refreshData(); // Revert on error
          alert('Failed to remove item from box');
        }
      }
    } else {
      // If in "All Items" or elsewhere, permanently delete
      if (confirm('Are you sure you want to PERMANENTLY delete this item?')) {
        // Optimistic update
        setItems(prev => prev.filter(i => i.id !== itemId));
        setAllItems(prev => prev.filter(i => i.id !== itemId));

        try {
          await firebaseStorage.deleteItem(itemId);
        } catch (err) {
          console.error('Failed to delete item', err);
          refreshData(); // Revert on error
          alert('Failed to delete item');
        }
      }
    }
  };

  async function handleDeleteBox(id) {
    if (!confirm('Are you sure you want to delete this box and all its items?')) return;

    // Optimistic update
    setBoxes(prev => prev.filter(b => b.id !== id));
    setItems(prev => prev.filter(i => i.boxId !== id));
    setAllItems(prev => prev.filter(i => i.boxId !== id));

    if (currentBox?.id === id) {
      handleBack();
    }

    try {
      await firebaseStorage.deleteBox(id);
    } catch (err) {
      console.error('Failed to delete box', err);
      refreshData(); // Revert
      alert('Failed to delete box');
    }
  };

  async function handleRemoveBox(id) {
    if (!confirm('Are you sure you want to remove this box? Items will be moved to "Unassigned".')) return;

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

    } catch (err) {
      console.error('Failed to remove box', err);
      refreshData(); // Revert
      alert('Failed to remove box');
    }
  };

  // Handle Editing Box
  const handleEditBox = (box) => {
    setEditingBox(box);
  };

  const handleUpdateBox = async (updates) => {
    if (!editingBox) return;

    try {
      // Process images if they exist
      let processedUpdates = { ...updates };

      if (updates.images && Array.isArray(updates.images)) {
        // Separate File objects from URLs
        const imageUrls = [];
        for (const img of updates.images) {
          if (img instanceof File) {
            // Upload new image
            const url = await firebaseStorage.uploadImage(img, 'boxes');
            imageUrls.push(url);
          } else {
            // Keep existing URL
            imageUrls.push(img);
          }
        }
        processedUpdates.images = imageUrls;
        processedUpdates.image = imageUrls.length > 0 ? imageUrls[0] : null;
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
      alert('Failed to update box: ' + err.message);
    }
  };

  // Handle Editing Item
  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleUpdateItem = async (payload) => {
    if (!editingItem) return;

    try {
      let imageUrls = editingItem.images || (editingItem.image ? [editingItem.image] : []);

      // If new images are provided (File objects), upload them
      // Note: payload.images contains the final list of images (some might be URLs, some Files)
      if (payload.images) {
        const newImageUrls = [];
        for (const img of payload.images) {
          if (img instanceof File) {
            const url = await firebaseStorage.uploadImage(img, 'items');
            newImageUrls.push(url);
          } else {
            newImageUrls.push(img);
          }
        }
        imageUrls = newImageUrls;
      }

      const updatedItem = {
        ...editingItem,
        name: payload.name,
        description: payload.description,
        images: imageUrls,
        image: imageUrls.length > 0 ? imageUrls[0] : null, // Backward compatibility
        tags: payload.tags || [],
        boxId: payload.boxId || ''
      };

      // Persist to Firebase
      // We pass the fields that changed. internal logic in updateItem handles merging.
      const persistedItem = await firebaseStorage.updateItem(editingItem.id, {
        name: payload.name,
        description: payload.description,
        images: imageUrls,
        image: imageUrls.length > 0 ? imageUrls[0] : null,
        tags: payload.tags || [],
        boxId: payload.boxId || ''
      });

      setItems(prev => prev.map(item => item.id === editingItem.id ? persistedItem : item));
      setAllItems(prev => prev.map(item => item.id === editingItem.id ? persistedItem : item));
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item. Please try again.");
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
      // Update the item's boxId to the current box
      const updates = { boxId: currentBox.id };
      await firebaseStorage.updateItem(itemId, updates);

      // Refresh data to show the updated item in the current box
      if (view === 'items') {
        const boxItems = await firebaseStorage.getItems(currentBox.id);
        setItems(boxItems);
      }
    } catch (err) {
      console.error('Failed to move item', err);
      alert('Failed to move item: ' + err.message);
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

  // Handle Fullscreen Image
  const handleImageClick = (images, itemName) => {
    // If a single string is passed (legacy), wrap it in an array
    const imageList = Array.isArray(images) ? images : [images];
    setFullscreenImage({ isOpen: true, url: imageList[0], images: imageList, name: itemName });
  };

  const handleCloseFullscreenImage = () => {
    setFullscreenImage({ isOpen: false, url: '', images: [], name: '' });
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <AuthModal isOpen={!user} onClose={() => { }} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        {/* Top Bar - User Info */}
        {user && (
          <div className="bg-slate-950/50 border-b border-white/5 py-1.5 px-4">
            <div className="container flex justify-end items-center gap-4">
              <span className="text-xs text-slate-400">Signed in as <span className="text-white font-medium ml-1">{user.email}</span></span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut size={12} /> Sign Out
              </button>
              <div className="w-px h-3 bg-white/10 mx-1"></div>
              <button
                onClick={() => setIsTagManagementModalOpen(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                title="Manage Tags"
              >
                <Tags size={12} /> Manage Tags
              </button>
            </div>
          </div>
        )}

        <div className="container py-3">
          <div className="flex items-center gap-4">
            {/* Back button - only when inside a box */}
            {view === 'items' && (
              <button onClick={handleBack} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0">
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
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  {currentBox?.name}
                </h1>
              )}
            </div>

            {/* Tab Switcher in header — only on top-level views */}
            {!currentBox && (
              <div className="flex bg-slate-900/40 p-1 rounded-xl flex-1 max-w-xs border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
                {[
                  { id: 'boxes', label: 'Your Boxes', onClick: handleBack },
                  { id: 'allItems', label: 'Your Items', onClick: handleListAllItems }
                ].map(tab => {
                  const isActive = view === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={tab.onClick}
                      className={`flex-1 flex items-center justify-center py-2 px-3 text-lg font-bold rounded-lg transition-colors duration-300 relative ${isActive ? 'text-primary' : 'text-slate-400 hover:text-white/90'}`}
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

            {/* Search bar for inside-box view */}
            {view === 'items' && (
              <div className="flex-1 max-w-xs">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search in this box..."
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 animate-fade-in">

        {/* Box List View */}
        {view === 'boxes' && (
          <>
            {/* Title + count */}
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Boxes</h2>
              <span className="text-slate-400 text-sm">{filteredBoxes.length} boxes</span>
            </div>
            {/* Search */}
            <div className="mb-6">
              <SearchBar
                value={boxSearchQuery}
                onChange={setBoxSearchQuery}
                placeholder="Search your boxes..."
              />
            </div>

            {/* Controls Row - Horizontal Layout */}
            <div className="flex items-center justify-between mb-6 bg-slate-900/50 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
              {/* Left: Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Sort by:</span>
                <select
                  value={boxSortOrder}
                  onChange={(e) => setBoxSortOrder(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm cursor-pointer hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="newest" className="bg-slate-800">Newest</option>
                  <option value="oldest" className="bg-slate-800">Oldest</option>
                  <option value="name-asc" className="bg-slate-800">Name (A-Z)</option>
                  <option value="name-desc" className="bg-slate-800">Name (Z-A)</option>
                </select>
              </div>

              {/* Right: Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Filter:</span>
                <select
                  value={selectedBoxTag}
                  onChange={(e) => setSelectedBoxTag(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm cursor-pointer hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            <BoxList
              boxes={filteredBoxes}
              allItems={allItems}
              onBoxClick={handleBoxClick}
              onAddClick={() => setIsAddBoxModalOpen(true)}
              onDeleteBox={handleDeleteBox}
              onEditBox={handleEditBox}
              onRemoveBox={handleRemoveBox}
              onAddItemClick={() => setIsAddItemModalOpen(true)}
            />
          </>
        )}

        {/* Box View (Inside Box) */}
        {view === 'items' && currentBox && (
          <>
            {/* Box Header */}
            <div className="mb-8 animate-fade-in">
              {/* Image Banner */}
              <div className="w-full h-48 md:h-64 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden relative mb-6 group">
                <ImageSlider
                  images={currentBox.images && currentBox.images.length > 0 ? currentBox.images : (currentBox.image ? [currentBox.image] : [])}
                  alt={currentBox.name}
                  onImageClick={handleImageClick}
                  className="w-full h-full"
                  fit="cover"
                />
                {(!currentBox.images || currentBox.images.length === 0) && !currentBox.image && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <Package size={64} />
                  </div>
                )}
                {/* Visual gradient overlay to make the banner feel more integrated */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Box Info Row */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{currentBox.name}</h1>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEditBox(currentBox)}
                        className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95"
                        title="Edit Box"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleRemoveBox(currentBox.id)}
                        className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95"
                        title="Remove Box (keep items)"
                      >
                        <LogOut size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteBox(currentBox.id)}
                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-all hover:scale-105 active:scale-95"
                        title="Delete Box and Items"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-3xl">{currentBox.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    <span className="bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5">
                      <Calendar size={14} className="opacity-60" />
                      Created: {formatDate(currentBox.createdAt)}
                    </span>
                    <span className="bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5">
                      <Package size={14} className="opacity-60" />
                      {items.length} items
                    </span>
                  </div>
                </div>
              </div>
            </div>



            {/* Items Grid */}
            <ItemList
              items={items.map(item => ({ ...item, boxName: currentBox?.name }))}
              onAddClick={() => setIsAddItemModalOpen(true)}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onImageClick={(images, name, item) => handleEditItem(item)}
              showItemNavigation={true}
            />
          </>
        )}

        {/* All Items View */}
        {view === 'allItems' && (
          <>
            {/* Title + count */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Your Items</h2>
              <span className="text-slate-400 text-sm">{allItemsDisplayItems.length} items</span>
            </div>
            {/* Search */}
            <div className="mb-6">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search all items..."
              />
            </div>

            {/* Controls Row - Horizontal Layout */}
            <div className="flex items-center justify-between mb-6 bg-slate-900/50 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
              {/* Left: Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Sort by:</span>
                <select
                  value={itemSortOrder}
                  onChange={(e) => setItemSortOrder(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm cursor-pointer hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="newest" className="bg-slate-800">Newest</option>
                  <option value="oldest" className="bg-slate-800">Oldest</option>
                  <option value="name-asc" className="bg-slate-800">Name (A-Z)</option>
                  <option value="name-desc" className="bg-slate-800">Name (Z-A)</option>
                </select>
              </div>

              {/* Right: Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Filter:</span>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm cursor-pointer hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
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
      />

      <EditBoxModal
        isOpen={!!editingBox}
        onClose={() => setEditingBox(null)}
        onSave={handleUpdateBox}
        box={editingBox}
      />

      <EditItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        item={editingItem}
        boxes={boxes}
        availableTags={allTags}
      />

      <FullscreenImageModal
        isOpen={fullscreenImage.isOpen}
        onClose={handleCloseFullscreenImage}
        imageUrl={fullscreenImage.url}
        images={fullscreenImage.images}
        itemName={fullscreenImage.name}
      />
      <TagManagementModal 
        isOpen={isTagManagementModalOpen} 
        onClose={() => setIsTagManagementModalOpen(false)}
        allItems={allItems}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
}

export default App;
