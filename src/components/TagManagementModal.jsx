import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Tag, Edit2, Trash2, Check, X } from 'lucide-react';

export function TagManagementModal({ isOpen, onClose, allItems, onRenameTag, onDeleteTag, addToast, askConfirm }) {
    const [editingTag, setEditingTag] = useState(null); // { oldName, newName }
    const [isProcessing, setIsProcessing] = useState(false);

    const tagCounts = useMemo(() => {
        const counts = {};
        allItems.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    }, [allItems]);

    const handleStartRename = (tag) => {
        setEditingTag({ oldName: tag, newName: tag });
    };

    const handleCancelRename = () => {
        setEditingTag(null);
    };

    const handleConfirmRename = async () => {
        if (!editingTag || !editingTag.newName.trim()) {
            setEditingTag(null);
            return;
        }

        if (editingTag.newName.trim() === editingTag.oldName) {
            setEditingTag(null);
            return;
        }

        setIsProcessing(true);
        try {
            await onRenameTag(editingTag.oldName, editingTag.newName.trim());
            addToast(`Tag renamed to "${editingTag.newName.trim()}"`, "success");
            setEditingTag(null);
        } catch (err) {
            console.error("Failed to rename tag:", err);
            addToast("Failed to rename tag. Please try again.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (tag, count) => {
        const message = count > 0 
            ? `Are you sure you want to remove the tag "${tag}" from ${count} item(s)?`
            : `Are you sure you want to remove the tag "${tag}"?`;

        askConfirm({
            title: 'Delete Tag?',
            message: message,
            type: 'danger',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    await onDeleteTag(tag);
                    addToast(`Tag "${tag}" deleted`, "success");
                } catch (err) {
                    console.error("Failed to delete tag:", err);
                    addToast("Failed to delete tag. Please try again.", "error");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Tags">
            <div className="space-y-4">
                {tagCounts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Tag size={32} className="text-slate-500" />
                        </div>
                        <p className="text-slate-400">No tags found in your inventory.</p>
                        <p className="text-xs text-slate-500 mt-1">Tags you add to items will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {tagCounts.map(([tag, count]) => (
                            <div key={tag} className="py-3 flex items-center justify-between group">
                                <div className="flex-1 flex items-center gap-3 overflow-hidden">
                                    {editingTag?.oldName === tag ? (
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingTag.newName}
                                                onChange={(e) => setEditingTag({ ...editingTag, newName: e.target.value })}
                                                className="input py-1.5 text-sm flex-1 bg-slate-800/50 border-primary/30"
                                                disabled={isProcessing}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleConfirmRename();
                                                    if (e.key === 'Escape') handleCancelRename();
                                                }}
                                            />
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={handleConfirmRename}
                                                    className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
                                                    disabled={isProcessing}
                                                    title="Confirm rename"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button 
                                                    onClick={handleCancelRename}
                                                    className="p-1.5 text-slate-400 hover:bg-white/10 rounded-md transition-colors"
                                                    disabled={isProcessing}
                                                    title="Cancel"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-100 font-medium truncate">{tag}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-white/5 shrink-0">
                                                {count} {count === 1 ? 'item' : 'items'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                
                                {editingTag?.oldName !== tag && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button 
                                            onClick={() => handleStartRename(tag)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                                            title="Rename tag"
                                            disabled={isProcessing}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(tag, count)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-red-500/50"
                                            title="Delete tag"
                                            disabled={isProcessing}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-50 pointer-events-auto">
                    <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-200">Updating items...</span>
                    </div>
                </div>
            )}
        </Modal>
    );
}
