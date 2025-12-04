import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Upload, X, Search } from 'lucide-react';

export function AddItemModal({ isOpen, onClose, onAdd, boxes = [], initialBoxId = '', availableItems = [], availableTags = [], onSelectExisting }) {
    const [mode, setMode] = useState('create'); // 'create' | 'select'
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedBoxId, setSelectedBoxId] = useState(initialBoxId);
    const [tags, setTags] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExistingId, setSelectedExistingId] = useState('');
    const fileInputRef = useRef(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('create');
            setSelectedBoxId(initialBoxId || '');
            setSearchQuery('');
            setSelectedExistingId('');
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

    // Auto-select if search results in exactly one item
    useEffect(() => {
        if (searchQuery && filteredItems.length === 1) {
            setSelectedExistingId(filteredItems[0].id);
        } else if (filteredItems.length === 0) {
            setSelectedExistingId('');
        }
        // Note: We don't auto-clear if multiple items match, to preserve selection while typing
        // unless the selected item is no longer in the filtered list
        if (selectedExistingId && !filteredItems.find(i => i.id === selectedExistingId)) {
            setSelectedExistingId('');
        }
    }, [filteredItems, searchQuery, selectedExistingId]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Add new images to existing ones
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setImages(prev => [...prev, ...files]);
        setImagePreviews(prev => [...prev, ...newPreviews]);

        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const handleRemoveImage = (index) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            name,
            description,
            images,
            tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
            boxId: selectedBoxId
        });
        // reset
        setName('');
        setDescription('');
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setImages([]);
        setImagePreviews([]);
        setTags('');
        setSelectedBoxId('');
        if (fileInputRef.current) fileInputRef.current.value = null;
        if (typeof onClose === 'function') onClose();
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">Images</label>

                        {/* Image Previews Grid */}
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove image"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Button */}
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-800/50 transition-colors">
                            <Upload size={32} className="text-slate-500 mb-2" />
                            <span className="text-sm text-slate-400">
                                {imagePreviews.length > 0 ? 'Add more images' : 'Click to upload images'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-1">Upload one or more images</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => {
                                    setTags(e.target.value);
                                    // Show suggestions if typing the last tag
                                    const lastTag = e.target.value.split(',').pop().trim().toLowerCase();
                                    if (lastTag) {
                                        // Filter available tags
                                        const matches = availableTags.filter(t =>
                                            t.toLowerCase().startsWith(lastTag) &&
                                            !tags.toLowerCase().includes(t.toLowerCase()) // Exclude already added
                                        );
                                        setTagSuggestions(matches);
                                    } else {
                                        setTagSuggestions([]);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setTagSuggestions([]), 200)} // Delay to allow click
                                className="input"
                                placeholder="tool, heavy, metal"
                            />
                            {tagSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {tagSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                            onClick={() => {
                                                const currentTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                                                // Remove the partial tag being typed
                                                currentTags.pop();
                                                // Add the suggestion
                                                currentTags.push(suggestion);
                                                setTags(currentTags.join(', ') + ', ');
                                                setTagSuggestions([]);
                                            }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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
                    {/* Dropdown to select item */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Select Item</label>
                        <select
                            className="input"
                            value={selectedExistingId}
                            onChange={(e) => setSelectedExistingId(e.target.value)}
                        >
                            <option value="">Choose an item...</option>
                            {filteredItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} - {getBoxName(item.boxId)}
                                </option>
                            ))}
                        </select>
                        {filteredItems.length === 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                                {searchQuery ? 'No items match your search' : 'No items available to select'}
                            </p>
                        )}
                    </div>

                    {/* Optional search to filter dropdown */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                            placeholder="Filter items..."
                        />
                    </div>

                    <div className="text-xs text-slate-400 text-right">
                        Showing {filteredItems.length} of {selectableItems.length} items
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedExistingId) {
                                    if (onSelectExisting) onSelectExisting(selectedExistingId);
                                    if (typeof onClose === 'function') onClose();
                                }
                            }}
                            disabled={!selectedExistingId}
                            className="btn btn-primary"
                        >
                            Move Item
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
