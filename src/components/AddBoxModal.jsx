import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Upload, Trash2 } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { useModalDraft, clearDraft } from '../utils/draftStorage';

export function AddBoxModal({ isOpen, onClose, onAdd }) {
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
            setImagePreviews(draft.images || []);
        },
        () => ({ name: '', description: '', images: [] })
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

        // Add new images to existing ones (keeping them as base64 strings)
        setImages(prev => [...prev, ...newImages]);
        setImagePreviews(prev => [...prev, ...newImages]);

        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    // No need for cleanup effect anymore as we are using base64 strings

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = null;
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
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Box">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                        placeholder="e.g., Garage Tools"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input min-h-[100px]"
                        placeholder="What's in this box?"
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
                                        className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 active:scale-95 transition-transform"
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

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Box</button>
                </div>
            </form>
        </Modal>
    );
}
