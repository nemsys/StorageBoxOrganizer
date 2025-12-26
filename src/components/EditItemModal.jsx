import { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Upload, X, Calendar, History } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { formatDate, formatDateTime } from '../utils/dateUtils';

export function EditItemModal({ isOpen, onClose, onSave, item, boxes = [], availableTags = [] }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [tags, setTags] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [selectedBoxId, setSelectedBoxId] = useState('');
    const fileInputRef = useRef(null);

    // Populate form when item changes
    useEffect(() => {
        if (item) {
            setName(item.name || '');
            setDescription(item.description || '');

            // Handle both new array format and old single image format
            let initialImages = [];
            if (item.images && Array.isArray(item.images)) {
                initialImages = item.images;
            } else if (item.image) {
                initialImages = [item.image];
            }

            setImages(initialImages);
            setImagePreviews(initialImages);

            setTags(item.tags ? item.tags.join(', ') : '');
            setSelectedBoxId(item.boxId || '');
        }
    }, [item]);

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
        if (typeof onClose === 'function') onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Item">
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

                <div className="pt-6 mt-2 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500">
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
                    <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
}
