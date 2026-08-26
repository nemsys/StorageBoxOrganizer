import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { Upload, Trash2, Search, Camera } from 'lucide-react';
import { makeDerivatives, refsToThumbs } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';
import { usePhotoCapture } from '../native/usePhotoCapture';
import { useTranslation } from '../translations';

export function AddItemModal({ isOpen, onClose, onAdd, boxes = [], initialBoxId = '', availableItems = [], availableTags = [], onSelectExisting, askConfirm }) {
    const { t } = useTranslation();
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
            setImagePreviews(refsToThumbs(draft.images || []));
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

    // Removed cleanup effect for object URLs

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const requestRemoveImage = (index) => {
        if (typeof askConfirm === 'function') {
            askConfirm({
                title: t('photo.removeTitle'),
                message: t('photo.removeMessageAddItem', { addItem: t('item.add') }),
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
        if (!boxId) return t('box.unassigned');
        const box = boxes.find(b => b.id === boxId);
        return box?.name || t('box.unknown');
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('item.addTitle')}>
            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4 border-b border-border">
                <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'create'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted hover:text-content/90'
                        }`}
                >
                    {t('item.createNew')}
                </button>
                <button
                    type="button"
                    onClick={() => setMode('select')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'select'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted hover:text-content/90'
                        }`}
                >
                    {t('item.selectExisting')}
                </button>
            </div>

            {/* Create New Mode */}
            {mode === 'create' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">{t('common.name')}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder={t('item.namePlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">{t('box.label')}</label>
                        <select
                            value={selectedBoxId}
                            onChange={(e) => setSelectedBoxId(e.target.value)}
                            className="input"
                        >
                            <option value="">{t('box.unassignedOption')}</option>
                            {boxes.map(box => (
                                <option key={box.id} value={box.id}>
                                    {box.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">{t('common.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input min-h-[100px]"
                            placeholder={t('item.descriptionPlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">{t('common.images')}</label>

                        {/* Image Previews Grid */}
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={preview}
                                            alt={t('photo.preview', { index: index + 1 })}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => requestRemoveImage(index)}
                                            className="img-delete-btn"
                                            title={t('photo.remove')}
                                            aria-label={t('photo.remove')}
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
                                <span className="text-sm text-muted">{t('photo.take')}</span>
                            </button>
                            {/* Gallery: capture-free so the OS shows its lighter multi-select
                                picker (the intentional default — see draftStorage.js). */}
                            <label className="flex flex-col items-center justify-center flex-1 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-surface/50 transition-colors">
                                <Upload size={28} className="text-content/50 mb-2" />
                                <span className="text-sm text-muted">
                                    {imagePreviews.length > 0 ? t('photo.addMore') : t('photo.gallery')}
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
                        <p className="text-xs text-content/50 mt-1">{t('photo.hint')}</p>
                        <CameraCaptureModal
                            isOpen={cameraOpen}
                            onClose={() => setCameraOpen(false)}
                            onCapture={handleCameraCapture}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-muted">{t('common.tags')}</label>
                            <span className="text-[10px] text-content/50 uppercase tracking-wider">{t('item.tagsHint')}</span>
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
                            placeholder={t('item.tagsPlaceholder')}
                        />
                    </div>


                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="btn btn-ghost">{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary">{t('item.add')}</button>
                    </div>
                </form>
            )}

            {/* Select Existing Mode */}
            {mode === 'select' && (
                <div className="space-y-4">
                    {/* Dropdown to select item */}
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">{t('item.selectLabel')}</label>
                        <select
                            className="input"
                            value={selectedExistingId}
                            onChange={(e) => setSelectedExistingId(e.target.value)}
                        >
                            <option value="">{t('item.choosePlaceholder')}</option>
                            {filteredItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} - {getBoxName(item.boxId)}
                                </option>
                            ))}
                        </select>
                        {filteredItems.length === 0 && (
                            <p className="text-xs text-muted mt-1">
                                {searchQuery ? t('item.noMatch') : t('item.noneAvailable')}
                            </p>
                        )}
                    </div>

                    {/* Optional search to filter dropdown */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                            placeholder={t('item.filterPlaceholder')}
                        />
                    </div>

                    <div className="text-xs text-muted text-right">
                        {t('item.showingCount', { shown: filteredItems.length, total: selectableItems.length })}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="btn btn-ghost">{t('common.cancel')}</button>
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
                            {t('item.move')}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
