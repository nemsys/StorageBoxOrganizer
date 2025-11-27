import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Upload, X, Search } from 'lucide-react';

export function AddItemModal({ isOpen, onClose, onAdd, boxes = [], initialBoxId = '', availableItems = [], onSelectExisting }) {
    const [mode, setMode] = useState('create'); // 'create' | 'select'
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [selectedBoxId, setSelectedBoxId] = useState(initialBoxId);
    const [tags, setTags] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('create');
            setSelectedBoxId(initialBoxId || '');
            setSearchQuery('');
        }
    }, [isOpen, initialBoxId]);

    // Filter items that can be selected (exclude items already in current box)
    const selectableItems = useMemo(() => {
        return availableItems.filter(item => item.boxId !== initialBoxId);
    }, [availableItems, initialBoxId]);

    // Search filter
    const filteredItems = useMemo(() => {
        if (!searchQuery) return selectableItems;
        const query = searchQuery.toLowerCase();
        return selectableItems.filter(item =>
            item.name.toLowerCase().includes(query) ||
            (item.description || '').toLowerCase().includes(query) ||
            (item.tags || []).some(tag => tag.toLowerCase().includes(query))
        );
    }, [selectableItems, searchQuery]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        const url = URL.createObjectURL(file);
        setImage(file);
        setImagePreview(url);
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleRemoveImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImage(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            name,
            description,
            image,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            boxId: selectedBoxId
        });
        // reset
        setName('');
        setDescription('');
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImage(null);
        setImagePreview('');
        setTags('');
        setSelectedBoxId('');
        if (fileInputRef.current) fileInputRef.current.value = null;
        if (typeof onClose === 'function') onClose();
    };

    const handleSelectItem = (item) => {
        if (onSelectExisting) {
            onSelectExisting(item.id);
            if (typeof onClose === 'function') onClose();
        }
    };

    const getBoxName = (boxId) => {
        if (!boxId) return 'Unassigned';
        const box = boxes.find(b => b.id === boxId);
        return box?.name || 'Unknown Box';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Item">
            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-700">
                <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`px-4 py-2 font-medium transition-colors ${mode === 'create'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Create New
                </button>
                <button
                    type="button"
                    onClick={() => setMode('select')}
                    className={`px-4 py-2 font-medium transition-colors ${mode === 'select'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Select Existing
                </button>
            </div>

            {/* Create New Mode */}
            {mode === 'create' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="e.g., Hammer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Box</label>
                        <select
                            value={selectedBoxId}
                            onChange={(e) => setSelectedBoxId(e.target.value)}
                            className="input"
                        >
                            <option value="">Unassigned (No Box)</option>
                            {boxes.map(box => (
                                <option key={box.id} value={box.id}>
                                    {box.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input min-h-[100px]"
                            placeholder="Details about the item..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Image</label>
                        {imagePreview ? (
                            <div className="relative group">
                                <img src={imagePreview} alt="Preview" className="preview-img" />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                                    title="Remove image"
                                >
                                    <X size={16} />
                                </button>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                                    <div className="text-center text-white">
                                        <Upload size={24} className="mx-auto mb-1" />
                                        <span className="text-xs">Click to change</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-800/50 transition-colors">
                                <Upload size={32} className="text-slate-500 mb-2" />
                                <span className="text-sm text-slate-400">Click to upload image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    className="hidden"
                                />
                            </label>
                        )}
                        <p className="text-xs text-slate-500 mt-1">Upload an image or leave empty for a placeholder.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="input"
                            placeholder="tool, heavy, metal"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Item</button>
                    </div>
                </form>
            )}

            {/* Select Existing Mode */}
            {mode === 'select' && (
                <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                            placeholder="Search items..."
                        />
                    </div>

                    {/* Items List */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredItems.length === 0 ? (
                            <p className="text-center text-slate-400 py-8">
                                {searchQuery ? 'No items found' : 'No items available to select'}
                            </p>
                        ) : (
                            filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors border border-slate-700 hover:border-primary"
                                >
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                                    ) : (
                                        <div className="w-16 h-16 flex items-center justify-center bg-slate-700 rounded text-slate-500">
                                            <Upload size={24} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-white truncate">{item.name}</h4>
                                        <p className="text-sm text-slate-400 truncate">{item.description || 'No description'}</p>
                                        <p className="text-xs text-slate-500 mt-1">Currently in: {getBoxName(item.boxId)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
