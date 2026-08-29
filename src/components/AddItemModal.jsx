import { useState, useRef, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { TagInput } from './TagInput';
import { Upload, Trash2, Search, Camera, Package, X, Check } from 'lucide-react';
import { makeDerivatives, refsToThumbs, getImageRefs } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';
import { usePhotoCapture } from '../native/usePhotoCapture';
import { useTranslation } from '../translations';
import { parseTagInput } from '../utils/tagUtils';

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

    // Same fuzzy engine as every other search field in the app — a substring
    // match here meant one typo produced "no items" while the item was right
    // there.
    const filteredItems = useMemo(() => {
        if (!searchQuery) return selectableItems;
        const fuse = new Fuse(selectableItems, {
            keys: ['name', 'description', 'tags'],
            threshold: 0.3,
        });
        return fuse.search(searchQuery).map(r => r.item);
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
            tags: parseTagInput(tags),
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
                                    {t('photo.gallery')}
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
                        <p className="text-xs text-muted mt-1">{t('photo.hint')}</p>
                        <CameraCaptureModal
                            isOpen={cameraOpen}
                            onClose={() => setCameraOpen(false)}
                            onCapture={handleCameraCapture}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-muted">{t('common.tags')}</label>
                            <span className="text-[10px] text-muted uppercase tracking-wider">{t('item.tagsHint')}</span>
                        </div>

                        <TagInput
                            value={tags}
                            onChange={setTags}
                            suggestions={availableTags}
                            placeholder={t('item.tagsPlaceholder')}
                            hint={{ remove: (tag) => t('tags.remove', { tag }) }}
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
                    {/* Search first, then results: the old order put a native
                        <select> above the field that narrowed it, and offered no
                        photos in an app whose whole point is recognising things
                        by sight. */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10 pr-10 text-[16px]"
                            placeholder={t('item.filterPlaceholder')}
                            aria-label={t('item.filterPlaceholder')}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-content"
                                aria-label={t('search.clear')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1" role="listbox" aria-label={t('item.selectLabel')}>
                        {filteredItems.map(item => {
                            const thumb = refsToThumbs(getImageRefs(item))[0];
                            const isSelected = selectedExistingId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedExistingId(isSelected ? '' : item.id)}
                                    className={`picker-row ${isSelected ? 'picker-row--on' : ''}`}
                                >
                                    {thumb ? (
                                        <img src={thumb} alt="" className="picker-row__thumb" />
                                    ) : (
                                        <span className="picker-row__thumb flex items-center justify-center text-muted">
                                            <Package size={18} />
                                        </span>
                                    )}
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-content truncate">{item.name}</span>
                                        <span className="block text-xs text-muted truncate">{getBoxName(item.boxId)}</span>
                                    </span>
                                    {isSelected && <Check size={18} className="shrink-0 text-primary" />}
                                </button>
                            );
                        })}

                        {filteredItems.length === 0 && (
                            <p className="text-sm text-muted py-6 text-center">
                                {searchQuery ? t('item.noMatch') : t('item.noneAvailable')}
                            </p>
                        )}
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
