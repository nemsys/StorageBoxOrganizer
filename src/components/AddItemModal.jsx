import { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Upload, X } from 'lucide-react';

export function AddItemModal({ isOpen, onClose, onAdd, boxes = [], initialBoxId = '' }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [image, setImage] = useState(null); // File | null
	const [imagePreview, setImagePreview] = useState(''); // object URL
	const [selectedBoxId, setSelectedBoxId] = useState(initialBoxId);
	const fileInputRef = useRef(null);

	// Reset selected box when initialBoxId changes or modal opens
	useEffect(() => {
		if (isOpen) {
			setSelectedBoxId(initialBoxId || '');
		}
	}, [isOpen, initialBoxId]);

	const handleFileChange = (e) => {
		const file = e.target.files?.[0] || null;
		if (!file) return;
		// revoke previous preview to avoid leak
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		const url = URL.createObjectURL(file);
		setImage(file);
		setImagePreview(url);
		if (fileInputRef.current) fileInputRef.current.value = null;
	};

	useEffect(() => {
		return () => {
			if (imagePreview) URL.revokeObjectURL(imagePreview);
		};
	}, [imagePreview]);

	const handleRemoveImage = () => {
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		setImage(null);
		setImagePreview('');
		if (fileInputRef.current) fileInputRef.current.value = null;
	};

	const [tags, setTags] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		// pass the File (or null) to parent; storage layer should handle blobs
		onAdd({
			name,
			description,
			image, // File | null
			tags: tags.split(',').map(t => t.trim()).filter(Boolean),
			boxId: selectedBoxId
		});
		// reset
		setName('');
		setDescription('');
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		setImage(null);
		setImagePreview('');
		setTags('');
		setSelectedBoxId('');
		if (fileInputRef.current) fileInputRef.current.value = null;
		if (typeof onClose === 'function') onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Add New Item">
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
					<label className="block text-sm font-medium text-slate-300 mb-1">Image</label>

					{imagePreview ? (
						<div className="relative group">
							<img src={imagePreview} alt="Preview" className="preview-img" />
							<button
								type="button"
								onClick={handleRemoveImage}
								className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
								title="Remove image"
							>
								<X size={16} />
							</button>
							<label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
								<div className="text-center text-white">
									<Upload size={24} className="mx-auto mb-1" />
									<span className="text-xs">Click to change</span>
								</div>
								<input
									type="file"
									accept="image/*"
									capture="environment"
									onChange={handleFileChange}
									ref={fileInputRef}
									className="hidden"
								/>
							</label>
						</div>
					) : (
						<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-800/50 transition-colors">
							<Upload size={32} className="text-slate-500 mb-2" />
							<span className="text-sm text-slate-400">Click to upload image</span>
							<input
								type="file"
								accept="image/*"
								capture="environment"
								onChange={handleFileChange}
								ref={fileInputRef}
								className="hidden"
							/>
						</label>
					)}
					<p className="text-xs text-slate-500 mt-1">Upload an image or leave empty for a placeholder.</p>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
					<input
						type="text"
						value={tags}
						onChange={(e) => setTags(e.target.value)}
						className="input"
						placeholder="tool, heavy, metal"
					/>
				</div>

				<div className="pt-4 flex justify-end gap-3">
					<button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
					<button type="submit" className="btn btn-primary">Add Item</button>
				</div>
			</form>
		</Modal>
	);
}
