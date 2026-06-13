import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Upload, Trash2, Search } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';

export function AddItemModal({ isOpen, onClose, onAdd, boxes = [], initialBoxId = '', availableItems = [], availableTags = [], onSelectExisting, askConfirm }) {
    const [mode, setMode] = useState('create'); // 'create' | 'select'
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedBoxId, setSelectedBoxId] = useState(initialBoxId);
    const [tags, setTags] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExistingId, setSelectedExistingId] = useState('');
    const fileInputRef = useRef(null);

    const draftKey = 'add-item';

    // Reset transient "select existing" UI when the modal opens. The create-mode
    // fields (name/description/images/tags/box) are owned by useModalDraft below.
    useEffect(() => {
        if (isOpen) {
            setMode('create');
            setSearchQuery('');
            setSelectedExistingId('');
        }
    }, [isOpen]);

    // Restore the in-progress item (and any captured image) after a mobile
    // camera-induced page reload, otherwise start from a clean form.
    useModalDraft(
        draftKey,
        isOpen,
        { name, description, images, tags, selectedBoxId },
        (draft) => {
            setName(draft.name || '');
            setDescription(draft.description || '');
            setImages(draft.images || []);
            setImagePreviews(draft.images || []);
            setTags(draft.tags || '');
            setSelectedBoxId(draft.selectedBoxId || '');
        },
        () => ({
            name: '',
            description: '',
            images: [],
            tags: '',
            selectedBoxId: initialBoxId || ''
        })
    );

    const handleClose = () => {
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

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

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Resize and get base64 for each file
        const newImages = await Promise.all(
            files.map(file => resizeImage(file))
        );

        // Add new images to existing ones
        setImages(prev => [...prev, ...newImages]);
        setImagePreviews(prev => [...prev, ...newImages]);

        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    // Removed cleanup effect for object URLs

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const requestRemoveImage = (index) => {
        if (typeof askConfirm === 'function') {
            askConfirm({
                title: 'Remove image?',
                message: 'Your changes are not saved until you tap Add Item.',
                type: 'danger',
                onConfirm: () => handleRemoveImage(index)
            });
        } else {
            handleRemoveImage(index);
        }
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
        // reset
        setName('');
        setDescription('');
        setImages([]);
        setImagePreviews([]);
        setTags('');
        setSelectedBoxId('');
        if (fileInputRef.current) fileInputRef.current.value = null;
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

    const getBoxName = (boxId) => {
        if (!boxId) return 'Unassigned';
        const box = boxes.find(b => b.id === boxId);
        return box?.name || 'Unknown Box';
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Item">
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
                                            onClick={() => requestRemoveImage(index)}
                                            className="img-delete-btn"
                                            title="Remove image"
                                            aria-label="Remove image"
                                        >
                                            <Trash2 size={16} />
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
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-1">Upload one or more images</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-slate-300">Tags</label>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tap chips to add</span>
                        </div>

                        {/* Tag Ribbon - Horizontal Scrollable Suggestions */}
                        <div className="tag-ribbon">
                            {availableTags
                                .filter(t => {
                                    const lastTag = tags.split(',').pop().trim().toLowerCase();
                                    if (!lastTag) return true; // Show all if not typing
                                    return t.toLowerCase().includes(lastTag);
                                })
                                .map(suggestion => {
                                    const currentTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                                    const isActive = currentTags.includes(suggestion.toLowerCase());

                                    return (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            className={`tag-chip ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                const parts = tags.split(',').map(t => t.trim()).filter(Boolean);
                                                const lowerSuggestion = suggestion.toLowerCase();

                                                if (isActive) {
                                                    // Remove tag
                                                    setTags(parts.filter(p => p.toLowerCase() !== lowerSuggestion).join(', ') + (parts.length > 1 ? ', ' : ' '));
                                                } else {
                                                    // Add tag - replace the last partial tag if it matches
                                                    const lastPartial = parts[parts.length - 1] || '';
                                                    if (suggestion.toLowerCase().startsWith(lastPartial.toLowerCase())) {
                                                        parts.pop();
                                                    }
                                                    parts.push(suggestion);
                                                    setTags(parts.join(', ') + ', ');
                                                }
                                            }}
                                        >
                                            {suggestion}
                                        </button>
                                    );
                                })
                            }
                        </div>

                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="input"
                            placeholder="tool, heavy, metal..."
                        />
                    </div>


                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
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
                        <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedExistingId) {
                                    if (onSelectExisting) onSelectExisting(selectedExistingId);
                                    handleClose();
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
