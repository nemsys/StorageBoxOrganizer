import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { FullscreenImageModal } from './FullscreenImageModal';
import { usePhotoCapture } from '../native/usePhotoCapture';
import { Upload, Trash2, Calendar, History, Camera } from 'lucide-react';
import { makeDerivatives, getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';

export function EditItemModal({ isOpen, onClose, onSave, item, boxes = [], availableTags = [], askConfirm }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [tags, setTags] = useState('');
    const [selectedBoxId, setSelectedBoxId] = useState('');
    const [viewerIndex, setViewerIndex] = useState(null); // null = closed
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
            setImagePreviews(refsToThumbs(draft.images || []));
            setTags(draft.tags || '');
            setSelectedBoxId(draft.selectedBoxId || '');
        },
        () => ({
            name: item?.name || '',
            description: item?.description || '',
            // Refs ({id, thumb}) for existing images; new captures append {thumb, full}.
            images: getImageRefs(item),
            tags: item?.tags ? item.tags.join(', ') : '',
            selectedBoxId: item?.boxId || ''
        })
    );

    const handleClose = () => {
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

    const handleFileChange = async (e) => {
        // Capture the firing input up front so we can reset it after the await
        // (works for both the camera and the gallery input).
        const input = e.target;
        const files = Array.from(input.files || []);
        if (files.length === 0) return;

        // Build thumb + full derivatives for each file.
        const derived = (await Promise.all(files.map(file => makeDerivatives(file)))).filter(Boolean);

        // Add new images (objects {thumb, full}) to existing ones.
        setImages(prev => [...prev, ...derived]);
        setImagePreviews(prev => [...prev, ...derived.map(d => d.thumb)]);

        if (input) input.value = null;
    };

    // Append a captured photo (already { thumb, full } derivatives).
    const handleCameraCapture = (derivatives) => {
        if (!derivatives) return;
        setImages(prev => [...prev, derivatives]);
        setImagePreviews(prev => [...prev, derivatives.thumb]);
    };

    // Native camera on device, in-page getUserMedia camera on web.
    const { takePhoto, cameraOpen, setCameraOpen } = usePhotoCapture(handleCameraCapture);

    // Removed cleanup effect as we don't use blob URLs for new images anymore

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const requestRemoveImage = (index) => {
        if (typeof askConfirm === 'function') {
            askConfirm({
                title: 'Remove image?',
                message: 'Your changes are not saved until you tap Save Changes.',
                type: 'danger',
                onConfirm: () => handleRemoveImage(index)
            });
        } else {
            handleRemoveImage(index);
        }
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
                    <label className="block text-sm font-medium text-muted mb-1">Name</label>
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
                    <label className="block text-sm font-medium text-muted mb-1">Box</label>
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
                    <label className="block text-sm font-medium text-muted mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input min-h-[100px]"
                        placeholder="Details about the item..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted mb-1">Images</label>

                    {/* Image Previews Grid */}
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
                                        onClick={() => setViewerIndex(index)}
                                        className="w-full h-full object-cover rounded-lg cursor-pointer"
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

                    {/* Upload Buttons — split so the camera is always reachable. */}
                    <div className="flex gap-3">
                        {/* Take Photo: opens the in-app camera so the page is never
                            backgrounded — reliable even on low-RAM devices whose OS would
                            otherwise discard the page during native capture. */}
                        <button
                            type="button"
                            onClick={takePhoto}
                            className="flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-surface/50 transition-colors"
                        >
                            <Camera size={28} className="text-content/50 mb-2" />
                            <span className="text-sm text-muted">Take Photo</span>
                        </button>
                        {/* Gallery: capture-free so the OS shows its lighter multi-select
                            picker (the intentional default — see draftStorage.js). */}
                        <label className="flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-surface/50 transition-colors">
                            <Upload size={28} className="text-content/50 mb-2" />
                            <span className="text-sm text-muted">
                                {imagePreviews.length > 0 ? 'Add more' : 'Gallery'}
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
                    </div>
                    <p className="text-xs text-content/50 mt-1">Take a photo or upload from your gallery</p>
                    <CameraCaptureModal
                        isOpen={cameraOpen}
                        onClose={() => setCameraOpen(false)}
                        onCapture={handleCameraCapture}
                    />
                    {/* Fullscreen slider for previews — tap a thumb to view full-res;
                        delete in place from here too (onDelete). */}
                    <FullscreenImageModal
                        isOpen={viewerIndex !== null}
                        onClose={() => setViewerIndex(null)}
                        imageRefs={images}
                        startIndex={viewerIndex ?? 0}
                        itemName={name}
                        onDelete={requestRemoveImage}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-muted">Tags</label>
                        <span className="text-[10px] text-content/50 uppercase tracking-wider">Tap chips to add</span>
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


                <div className="pt-6 mt-2 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-content/50">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-content/40" />
                        <span>Created: {formatDate(item?.createdAt)}</span>
                    </div>
                    {item?.modifiedAt && (
                        <div className="flex items-center gap-1.5">
                            <History size={12} className="text-content/40" />
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
