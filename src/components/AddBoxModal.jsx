import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { Upload, Trash2, Camera } from 'lucide-react';
import { makeDerivatives, refsToThumbs } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';
import { usePhotoCapture } from '../native/usePhotoCapture';
import { useTranslation } from '../translations';

export function AddBoxModal({ isOpen, onClose, onAdd, askConfirm }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const fileInputRef = useRef(null);

    const draftKey = 'add-box';

    // Restore the in-progress box (and any captured image) after a mobile
    // camera-induced page reload.
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
        () => ({ name: '', description: '', images: [] })
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

    // No need for cleanup effect anymore as we are using base64 strings

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const requestRemoveImage = (index) => {
        if (typeof askConfirm === 'function') {
            askConfirm({
                title: t('photo.removeTitle'),
                message: t('photo.removeMessageCreateBox', { createBox: t('box.create') }),
                type: 'danger',
                onConfirm: () => handleRemoveImage(index)
            });
        } else {
            handleRemoveImage(index);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // pass base64 strings to parent
        onAdd({ name, description, images });
        setName('');
        setDescription('');
        setImages([]);
        setImagePreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = null;
        clearDraft(draftKey);
        if (typeof onClose === 'function') onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('box.addTitle')}>
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

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-ghost">{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary">{t('box.create')}</button>
                </div>
            </form>
        </Modal>
    );
}
