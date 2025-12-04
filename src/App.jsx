import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
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
import { ArrowLeft, PackageOpen, LogOut, User, Filter, ArrowUpDown, Package } from 'lucide-react';
import { firebaseStorage } from './services/firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('boxes'); // 'boxes' | 'items' | 'allItems'
  const [currentBox, setCurrentBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // All items for selection
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [editingItem, setEditingItem] = useState(null);


  const [itemSortOrder, setItemSortOrder] = useState('newest'); // 'name-asc', 'name-desc', 'newest', 'oldest'
  const [selectedTag, setSelectedTag] = useState('');

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
        } else if (historyView === 'allItems') {
          setCurrentBox(null);
          const allItems = await firebaseStorage.getAllItems();
          setItems(allItems);
          setView('allItems');
          setSearchQuery('');
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

  const refreshData = async () => {
    if (!user) return;
    const loadedBoxes = await firebaseStorage.getBoxes();
    setBoxes(loadedBoxes);

    // Always load all items for selection purposes
    const allItemsData = await firebaseStorage.getAllItems();
    setAllItems(allItemsData);

    if (currentBox) {
      const loadedItems = await firebaseStorage.getItems(currentBox.id);
      setItems(loadedItems);
    } else {
      setItems(allItemsData);
    }
  };

  // Handle Box Selection
  const handleBoxClick = async (box) => {
    setCurrentBox(box);
    const boxItems = await firebaseStorage.getItems(box.id);
    setItems(boxItems);
    setView('items');
    setSearchQuery('');

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
      setBoxes(prev => [newBox, ...prev]);
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

  // Handle Deleting Box
  async function handleDeleteBox(id) {
    if (!confirm('Are you sure you want to delete this box and all its items?')) return;

    // Optimistic update
    setBoxes(prev => prev.filter(b => b.id !== id));

    try {
      await firebaseStorage.deleteBox(id);
    } catch (err) {
      console.error('Failed to delete box', err);
      refreshData(); // Revert
      alert('Failed to delete box');
    }
  };

  // Handle Removing Box (keep items)
  async function handleRemoveBox(id) {
    if (!confirm('Are you sure you want to remove this box? Items will be moved to "Unassigned".')) return;

    // Optimistic update - remove box from list
    setBoxes(prev => prev.filter(b => b.id !== id));

    try {
      // 1. Find all items in this box
      const boxItems = await firebaseStorage.getItems(id);

      // 2. Update all items to have no boxId
      await Promise.all(boxItems.map(item =>
        firebaseStorage.updateItem(item.id, { boxId: '' })
      ));

      // 3. Delete the box
      // Note: firebaseStorage.deleteBox also deletes items in the box,
      // but since we just moved them, it won't find any to delete.
      await firebaseStorage.deleteBox(id);

      // Update local items state if needed
      // If we are viewing "All Items", we might need to update their boxId in the local state
      setAllItems(prev => prev.map(i => i.boxId === id ? { ...i, boxId: '' } : i));

      // Also update 'items' state if we happen to be viewing them (though we probably aren't if we just deleted the box)
      setItems(prev => prev.map(i => i.boxId === id ? { ...i, boxId: '' } : i));

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

      // Persist to Firebase
      const updatedBox = await firebaseStorage.updateBox(editingBox.id, processedUpdates);

      // Update with server data
      setBoxes(prev => prev.map(b =>
        b.id === editingBox.id ? updatedBox : b
      ));

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

      setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item. Please try again.");
    }
  };

  // Handle Selecting Existing Item
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

  // Compute all unique tags from items
  const allTags = useMemo(() => {
    const tagSet = new Set();
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [items]);

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
    return [...result].sort((a, b) => {
      switch (itemSortOrder) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
        case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
        default: return 0;
      }
    });
  }, [items, selectedTag, searchQuery, itemSortOrder, view]);

  // Handle List All Items
  const handleListAllItems = async () => {
    setCurrentBox(null);
    const allItems = await firebaseStorage.getAllItems();
    setItems(allItems);
    setView('allItems');
    setSearchQuery('');
    setSelectedTag('');

    // Push to browser history
    window.history.pushState({ view: 'allItems' }, '', '#all-items');
  };

  const displayItems = (view === 'items' || view === 'allItems') ? filteredItems : globalSearchResults;
  const isSearchingGlobal = view === 'boxes' && searchQuery.length > 0;

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
            </div>
          </div>
        )}

        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {(view === 'items' || view === 'allItems') && (
                <button onClick={handleBack} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors mr-2">
                  <ArrowLeft size={24} />
                </button>
              )}
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleBack}
                title="Go to Home"
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <PackageOpen size={24} />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  {view === 'items' ? currentBox?.name : (view === 'allItems' ? 'All Items' : 'StorageBox')}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-full md:w-auto md:min-w-[300px]">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={view === 'items' ? "Search in this box..." : "Search all items..."}
                />
              </div>

              {view === 'boxes' && (
                <button
                  onClick={handleListAllItems}
                  className="btn btn-secondary whitespace-nowrap text-white"
                >
                  List all items
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 animate-fade-in">

        {/* Box List View */}
        {view === 'boxes' && !isSearchingGlobal && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Boxes</h2>
              <span className="text-slate-400 text-sm">{boxes.length} boxes</span>
            </div>
            <BoxList
              boxes={boxes}
              onBoxClick={handleBoxClick}
              onAddClick={() => setIsAddBoxModalOpen(true)}
              onDeleteBox={handleDeleteBox}
              onEditBox={handleEditBox}
              onRemoveBox={handleRemoveBox}
              onAddItemClick={() => setIsAddItemModalOpen(true)}
            />
          </>
        )}

        {/* Global Search Results View */}
        {isSearchingGlobal && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Search Results</h2>
              <span className="text-slate-400 text-sm">{displayItems.length} items found</span>
            </div>
            {displayItems.length > 0 ? (
              <ItemList
                items={displayItems}
                onAddClick={() => { }}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
                onBoxClick={handleBoxClickFromSearch}
                onImageClick={handleImageClick}
              />
            ) : (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">No items found matching "{searchQuery}"</p>
              </div>
            )}
          </>
        )}

        {/* Box View (Inside Box) */}
        {view === 'items' && currentBox && (
          <>
            {/* Box Header */}
            <div className="mb-8 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
                <div className="w-full md:w-80 flex-shrink-0 aspect-square relative">
                  <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50">
                    <ImageSlider
                      images={currentBox.images && currentBox.images.length > 0 ? currentBox.images : (currentBox.image ? [currentBox.image] : [])}
                      alt={currentBox.name}
                      onImageClick={handleImageClick}
                      className="w-full h-full"
                    />
                    {(!currentBox.images || currentBox.images.length === 0) && !currentBox.image && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                        <Package size={64} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl font-bold text-white mb-2">{currentBox.name}</h1>
                  <p className="text-slate-300 text-lg leading-relaxed mb-4">{currentBox.description}</p>
                  <div className="flex gap-4 text-sm text-slate-400">
                    <span className="bg-slate-800 px-3 py-1 rounded-full">Created: {new Date(currentBox.createdAt).toLocaleDateString()}</span>
                    <span className="bg-slate-800 px-3 py-1 rounded-full">{items.length} items</span>
                  </div>
                </div>
              </div>
            </div>



            {/* Items Grid */}
            <ItemList
              items={items}
              onAddClick={() => setIsAddItemModalOpen(true)}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onImageClick={handleImageClick}
              showItemNavigation={true}
            />
          </>
        )}

        {/* All Items View */}
        {view === 'allItems' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">All Items</h2>
              <span className="text-slate-400 text-sm">{allItemsDisplayItems.length} items</span>
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
    </div>
  );
}

export default App;
