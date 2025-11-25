import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { storageService } from './services/storage';
import { BoxList } from './components/BoxList';
import { ItemList } from './components/ItemList';
import { AddBoxModal } from './components/AddBoxModal';
import { AddItemModal } from './components/AddItemModal';
import { SearchBar } from './components/SearchBar';
import { ArrowLeft, PackageOpen } from 'lucide-react';
import storage from './storage';
import { BoxCard } from './components/BoxCard';

function App() {
  const [view, setView] = useState('boxes'); // 'boxes' | 'items'
  const [currentBox, setCurrentBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    storageService.seed(); // Seed if empty
    refreshData();
  }, []);

  const refreshData = () => {
    setBoxes(storageService.getBoxes());
    if (currentBox) {
      setItems(storageService.getItems(currentBox.id));
    } else {
      setItems(storageService.getAllItems());
    }
  };

  // Handle Box Selection
  const handleBoxClick = (box) => {
    setCurrentBox(box);
    setItems(storageService.getItems(box.id));
    setView('items');
    setSearchQuery(''); // Clear search when entering a box
  };

  // Handle Back to Home
  const handleBack = () => {
    setCurrentBox(null);
    setView('boxes');
    setSearchQuery('');
    refreshData();
  };

  // Handle Adding Box
  async function handleAddBox(payload) {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    let previewImage = '';
    if (payload.image && (payload.image instanceof File || payload.image instanceof Blob)) {
      previewImage = URL.createObjectURL(payload.image);
    } else if (typeof payload.image === 'string') {
      previewImage = payload.image;
    }

    const boxForState = {
      id,
      name: payload.name,
      description: payload.description,
      image: previewImage,
      createdAt
    };

    const boxToStore = {
      ...boxForState,
      image: payload.image
    };

    try {
      await storageService.addBox(boxToStore);
      setBoxes(prev => [boxForState, ...prev]);
    } catch (err) {
      console.error('Failed to save box', err);
      if (previewImage) URL.revokeObjectURL(previewImage);
    }
  }

  // Handle Adding Item
  async function handleAddItem(payload) {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    // Create a preview URL for immediate UI rendering if image is a File/Blob
    let previewImage = '';
    if (payload.image && (payload.image instanceof File || payload.image instanceof Blob)) {
      previewImage = URL.createObjectURL(payload.image);
    } else if (typeof payload.image === 'string') {
      previewImage = payload.image; // already a data URL or URL
    }

    const itemForState = {
      id,
      name: payload.name,
      description: payload.description,
      tags: payload.tags || [],
      image: previewImage, // string for <img src=...>
      createdAt
    };

    // Persist original item; pass the File/Blob so storage can store the blob in IndexedDB
    const itemToStore = {
      ...itemForState,
      image: payload.image // File | Blob | dataURL | '' (storage.js will handle)
    };

    try {
      // persist (storage.addItem will offload blobs to IDB and write metadata to localStorage)
      await storageService.addItem(itemToStore);
      // update UI state (insert at top for example)
      setItems(prev => [itemForState, ...prev]);
    } catch (err) {
      console.error('Failed to save item', err);
      // revoke preview if persistence failed and you won't keep it in state
      if (previewImage) URL.revokeObjectURL(previewImage);
    }
  }

  // Handle Deleting Item
  const handleDeleteItem = (itemId) => {
    if (confirm('Are you sure you want to delete this item?')) {
      storageService.deleteItem(itemId);
      refreshData();
    }
  };

  // new/updated handler: revoke preview URL, update state, call storage.deleteBox
  async function handleDeleteBox(id) {
    console.log('handleDeleteBox called for id:', id);
    // optimistic UI update: remove from state and revoke preview URL if needed
    setBoxes(prev => {
      const box = prev.find(b => b.id === id);
      if (box && box.image && typeof box.image === 'string' && box.image.startsWith('blob:')) {
        try { URL.revokeObjectURL(box.image); } catch (e) { /* ignore */ }
      }
      return prev.filter(b => b.id !== id);
    });

    try {
      await storage.deleteBox(id);
      console.log('storage.deleteBox succeeded for id:', id);
    } catch (err) {
      console.error('Failed to delete box from storage', err);
      // optional: reload boxes from storage.getAll() to reconcile
    }
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

  // Global Search (when in 'boxes' view, searching switches to 'global-search' view effectively)
  const globalSearchResults = useMemo(() => {
    if (view !== 'boxes' || !searchQuery) return [];

    const allItems = storageService.getAllItems();
    const fuse = new Fuse(allItems, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery).map(result => result.item);

    // Enrich items with box names
    return results.map(item => {
      const box = boxes.find(b => b.id === item.boxId);
      return { ...item, boxName: box?.name || 'Unknown Box' };
    });
  }, [view, searchQuery, boxes]); // Dependency on boxes to refresh if data changes

  // Handle Box Click from Search Results
  const handleBoxClickFromSearch = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (box) {
      handleBoxClick(box);
    }
  };

  // Determine what to display
  const displayItems = view === 'items' ? filteredItems : globalSearchResults;
  const isSearchingGlobal = view === 'boxes' && searchQuery.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {view === 'items' && (
                <button onClick={handleBack} className="btn-icon btn-ghost text-slate-400 hover:text-white">
                  <ArrowLeft size={24} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <PackageOpen size={24} />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  {view === 'items' ? currentBox.name : 'StorageBox'}
                </h1>
              </div>
            </div>

            <div className="w-full md:w-auto md:min-w-[300px]">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={view === 'items' ? "Search in this box..." : "Search all items..."}
              />
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
              onAddClick={() => setIsAddBoxOpen(true)}
              onDeleteBox={handleDeleteBox}
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
                onAddClick={() => { }} // Cannot add item in global search
                onDeleteItem={handleDeleteItem}
                onBoxClick={handleBoxClickFromSearch}
              />
            ) : (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">No items found matching "{searchQuery}"</p>
              </div>
            )}
          </>
        )}

        {/* Item List View (Inside Box) */}
        {view === 'items' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Items</h2>
              <span className="text-slate-400 text-sm">{displayItems.length} items</span>
            </div>
            <ItemList
              items={displayItems}
              onAddClick={() => setIsAddItemOpen(true)}
              onDeleteItem={handleDeleteItem}
            />
          </>
        )}
      </main>

      {/* Modals */}
      <AddBoxModal
        isOpen={isAddBoxOpen}
        onClose={() => setIsAddBoxOpen(false)}
        onAdd={handleAddBox}
      />

      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAdd={handleAddItem}
      />
    </div>
  );
}

export default App;
