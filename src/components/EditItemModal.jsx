import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Upload, X, Calendar, History } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';

export function EditItemModal({ isOpen, onClose, onSave, item, boxes = [], availableTags = [] }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [tags, setTags] = useState('');
    const [selectedBoxId, setSelectedBoxId] = useState('');
    const fileInputRef = useRef(null);

    const draftKey = `edit-item-${item?.id ?? 'unknown'}`;

    // Populate from a persisted draft (e.g. after a mobile camera-induced reload)
    // or, failing that, from the item itself. Keeps the unsaved photo and edits.
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
        () => {
            // Handle both new array format and old single image format
            let initialImages = [];
            if (item?.images && Array.isArray(item.images)) {
                initialImages = item.images;
            } else if (item?.image) {
                initialImages = [item.image];
            }
            return {
                name: item?.name || '',
                description: item?.description || '',
                images: initialImages,
                tags: item?.tags ? item.tags.join(', ') : '',
                selectedBoxId: item?.boxId || ''
            };
        }
    );

    const handleClose = () => {
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

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

    // Removed cleanup effect as we don't use blob URLs for new images anymore

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Pass updates to parent
        onSave({
            name,
            description,
            images,
            tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
            boxId: selectedBoxId
        });
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Edit Item">
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


                <div className="pt-6 mt-2 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-600" />
                        <span>Created: {formatDate(item?.createdAt)}</span>
                    </div>
                    {item?.modifiedAt && (
                        <div className="flex items-center gap-1.5">
                            <History size={12} className="text-slate-600" />
                            <span>Modified: {formatDateTime(item.modifiedAt)}</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
}
