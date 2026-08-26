import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { FullscreenImageModal } from './FullscreenImageModal';
import { Upload, Trash2, Camera, Calendar, History } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { makeDerivatives, getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';
import { usePhotoCapture } from '../native/usePhotoCapture';
import { useTranslation } from '../translations';

export function EditBoxModal({ isOpen, onClose, onSave, box, askConfirm }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [viewerIndex, setViewerIndex] = useState(null); // null = closed
    const fileInputRef = useRef(null);

    const draftKey = `edit-box-${box?.id ?? 'unknown'}`;

    // Restore a persisted draft (e.g. after a mobile camera-induced reload),
    // otherwise populate from the box itself.
    useModalDraft(
        draftKey,
        isOpen,
        { name, description, images },
        (draft) => {
            setName(draft.name || '');
            setDescription(draft.description || '');
            setImages(draft.images || []);
            setImagePreviews(refsToThumbs(draft.images || []));
        },
        () => ({
            name: box?.name || '',
            description: box?.description || '',
            // Refs ({id, thumb}) for existing images; new captures append {thumb, full}.
            images: getImageRefs(box)
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
    // Existing URLs are strings and don't need revocation

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const requestRemoveImage = (index) => {
        if (typeof askConfirm === 'function') {
            askConfirm({
                title: t('photo.removeTitle'),
                message: t('photo.removeMessageSave', { save: t('common.save') }),
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
        onSave({ name, description, images });
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('box.editTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">{t('common.name')}</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                        placeholder={t('box.namePlaceholder')}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted mb-1">{t('common.description')}</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input min-h-[100px]"
                        placeholder={t('box.descriptionPlaceholder')}
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
                                        onClick={() => setViewerIndex(index)}
                                        className="w-full h-full object-cover rounded-lg cursor-pointer"
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

                {/* The box view shows the last contents change; creation date
                    stays available here. */}
                <div className="pt-6 mt-2 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-content/50">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-content/40" />
                        <span>{t('box.createdOn', { date: formatDate(box?.createdAt) })}</span>
                    </div>
                    {box?.updatedAt && (
                        <div className="flex items-center gap-1.5">
                            <History size={12} className="text-content/40" />
                            <span>{t('box.updatedOn', { date: formatDate(box.updatedAt) })}</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-ghost">{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
}
