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
import { ArrowLeft, PackageOpen, LogOut, User } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

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
    refreshData();

    // Push to browser history
    window.history.pushState({ view: 'boxes' }, '', '#');
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

  // Handle Editing Box
  const handleEditBox = (box) => {
    setEditingBox(box);
  };

  const handleUpdateBox = async (updates) => {
    if (!editingBox) return;

    try {
      // Optimistic update
      setBoxes(prev => prev.map(b =>
        b.id === editingBox.id ? { ...b, ...updates } : b
      ));

      // Persist to Firebase
      const updatedBox = await firebaseStorage.updateBox(editingBox.id, updates);

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

  const handleUpdateItem = async (updates) => {
    if (!editingItem) return;

    try {
      // Optimistic update
      setItems(prev => prev.map(i =>
        i.id === editingItem.id ? { ...i, ...updates } : i
      ));

      // Persist to Firebase
      const updatedItem = await firebaseStorage.updateItem(editingItem.id, updates);

      // Update with server data
      setItems(prev => prev.map(i =>
        i.id === editingItem.id ? updatedItem : i
      ));

      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update item', err);
      refreshData(); // Revert on error
      alert('Failed to update item: ' + err.message);
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
  const handleImageClick = (imageUrl, itemName) => {
    setFullscreenImage({ isOpen: true, url: imageUrl, name: itemName });
  };

  const handleCloseFullscreenImage = () => {
    setFullscreenImage({ isOpen: false, url: '', name: '' });
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

  // Handle List All Items
  const handleListAllItems = async () => {
    setCurrentBox(null);
    const allItems = await firebaseStorage.getAllItems();
    setItems(allItems);
    setView('allItems');
    setSearchQuery('');

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
              onAddClick={() => setIsAddBoxOpen(true)}
              onDeleteBox={handleDeleteBox}
              onEditBox={handleEditBox}
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

        {/* Item List View (Inside Box or All Items) */}
        {(view === 'items' || view === 'allItems') && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {view === 'allItems' ? 'All Items' : 'Items'}
              </h2>
              <span className="text-slate-400 text-sm">{displayItems.length} items</span>
            </div>
            <ItemList
              items={displayItems}
              onAddClick={view === 'items' ? () => setIsAddItemOpen(true) : undefined}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onBoxClick={view === 'allItems' ? handleBoxClickFromSearch : undefined}
              onImageClick={handleImageClick}
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
      />

      <FullscreenImageModal
        isOpen={fullscreenImage.isOpen}
        onClose={handleCloseFullscreenImage}
        imageUrl={fullscreenImage.url}
        itemName={fullscreenImage.name}
      />
    </div>
  );
}

export default App;
