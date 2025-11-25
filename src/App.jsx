import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { BoxList } from './components/BoxList';
import { ItemList } from './components/ItemList';
import { AddBoxModal } from './components/AddBoxModal';
import { AddItemModal } from './components/AddItemModal';
import { SearchBar } from './components/SearchBar';
import { AuthModal } from './components/AuthModal';
import { ArrowLeft, PackageOpen, LogOut, User } from 'lucide-react';
import { firebaseStorage } from './services/firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('boxes'); // 'boxes' | 'items'
  const [currentBox, setCurrentBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

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
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    const loadedBoxes = await firebaseStorage.getBoxes();
    setBoxes(loadedBoxes);
    if (currentBox) {
      const loadedItems = await firebaseStorage.getItems(currentBox.id);
      setItems(loadedItems);
    } else {
      const allItems = await firebaseStorage.getAllItems();
      setItems(allItems);
    }
  };

  // Handle Box Selection
  const handleBoxClick = async (box) => {
    setCurrentBox(box);
    const boxItems = await firebaseStorage.getItems(box.id);
    setItems(boxItems);
    setView('items');
    setSearchQuery('');
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
    if (!user) return;
    const id = Date.now().toString();
    const createdAt = Date.now(); // Firestore prefers timestamps or numbers

    // Optimistic UI update
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
      image: payload.image // File will be uploaded by service
    };

    try {
      // Add to state immediately
      setBoxes(prev => [boxForState, ...prev]);

      // Persist
      const savedBox = await firebaseStorage.addBox(boxToStore);

      // Update state with real URL if it changed (e.g. from blob to firebase storage url)
      setBoxes(prev => prev.map(b => b.id === id ? savedBox : b));
    } catch (err) {
      console.error('Failed to save box', err);
      // Revert state on error
      setBoxes(prev => prev.filter(b => b.id !== id));
      if (previewImage && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
      alert('Failed to save box: ' + err.message);
    }
  }

  // Handle Adding Item
  async function handleAddItem(payload) {
    if (!user) return;
    const id = Date.now().toString();
    const createdAt = Date.now();

    let previewImage = '';
    if (payload.image && (payload.image instanceof File || payload.image instanceof Blob)) {
      previewImage = URL.createObjectURL(payload.image);
    } else if (typeof payload.image === 'string') {
      previewImage = payload.image;
    }

    const itemForState = {
      id,
      boxId: currentBox.id,
      name: payload.name,
      description: payload.description,
      tags: payload.tags || [],
      image: previewImage,
      createdAt
    };

    const itemToStore = {
      ...itemForState,
      image: payload.image
    };

    try {
      setItems(prev => [itemForState, ...prev]);
      const savedItem = await firebaseStorage.addItem(itemToStore);
      setItems(prev => prev.map(i => i.id === id ? savedItem : i));
    } catch (err) {
      console.error('Failed to save item', err);
      setItems(prev => prev.filter(i => i.id !== id));
      if (previewImage && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
      alert('Failed to save item: ' + err.message);
    }
  }

  // Handle Deleting Item
  const handleDeleteItem = async (itemId) => {
    if (confirm('Are you sure you want to delete this item?')) {
      // Optimistic update
      setItems(prev => prev.filter(i => i.id !== itemId));
      try {
        await firebaseStorage.deleteItem(itemId);
      } catch (err) {
        console.error('Failed to delete item', err);
        refreshData(); // Revert on error
        alert('Failed to delete item');
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

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
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

  const displayItems = view === 'items' ? filteredItems : globalSearchResults;
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
                  {view === 'items' ? currentBox?.name : 'StorageBox'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-full md:w-auto md:min-w-[300px]">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={view === 'items' ? "Search in this box..." : "Search all items..."}
                />
              </div>

              {user && (
                <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                  <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs text-slate-400">Signed in as</span>
                    <span className="text-sm font-medium text-white truncate max-w-[150px]">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="btn-icon btn-ghost text-slate-400 hover:text-red-400"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
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
                onAddClick={() => { }}
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
