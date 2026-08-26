import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Tag, Edit2, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from '../translations';

export function TagManagementModal({ isOpen, onClose, allItems, onRenameTag, onDeleteTag, addToast, askConfirm }) {
    const { t } = useTranslation();
    const [editingTag, setEditingTag] = useState(null); // { oldName, newName }
    const [isProcessing, setIsProcessing] = useState(false);
    const [tagSortOrder, setTagSortOrder] = useState('alpha'); // 'alpha' | 'count'

    const tagCounts = useMemo(() => {
        const counts = {};
        allItems.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => {
            if (tagSortOrder === 'alpha') {
                return a[0].localeCompare(b[0]);
            } else {
                // Sort by count descending, then by name ascending for ties
                return (b[1] - a[1]) || a[0].localeCompare(b[0]);
            }
        });
    }, [allItems, tagSortOrder]);

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
            addToast(t('tags.renamed', { name: editingTag.newName.trim() }), "success");
            setEditingTag(null);
        } catch (err) {
            console.error("Failed to rename tag:", err);
            addToast(t('tags.renameFailed'), "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (tag, count) => {
        const message = count > 0
            ? t('tags.deleteMessage', { name: tag, count })
            : t('tags.deleteMessageUnused', { name: tag });

        askConfirm({
            title: t('tags.deleteTitle'),
            message: message,
            type: 'danger',
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    await onDeleteTag(tag);
                    addToast(t('tags.deletedToast', { name: tag }), "success");
                } catch (err) {
                    console.error("Failed to delete tag:", err);
                    addToast(t('tags.deleteFailed'), "error");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('tags.title')}>
            <div className="space-y-4">
                {tagCounts.length > 0 && (
                    <div className="flex items-center justify-between pb-2 border-b border-content/15">
                        <span className="text-xs font-medium text-muted uppercase tracking-wider">
                            {t('tags.found', { count: tagCounts.length })}
                        </span>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-content/50">{t('common.sortBy')}</span>
                             <select
                                value={tagSortOrder}
                                onChange={(e) => setTagSortOrder(e.target.value)}
                                className="bg-surface border border-border/50 rounded-lg px-2 py-1 text-xs text-content cursor-pointer hover:bg-elevated transition-colors outline-none focus:ring-1 focus:ring-primary/50"
                             >
                                <option value="alpha" className="bg-base text-content">{t('tags.sortAlpha')}</option>
                                <option value="count" className="bg-base text-content">{t('tags.sortCount')}</option>
                             </select>
                        </div>
                    </div>
                )}

                {tagCounts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-content/15">
                            <Tag size={32} className="text-content/50" />
                        </div>
                        <p className="text-muted">{t('tags.emptyTitle')}</p>
                        <p className="text-xs text-content/50 mt-1">{t('tags.emptyHint')}</p>
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
                                                className="input py-1.5 text-sm flex-1 bg-surface/50 border-primary/30"
                                                disabled={isProcessing}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleConfirmRename();
                                                    if (e.key === 'Escape') handleCancelRename();
                                                }}
                                            />
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={handleConfirmRename}
                                                    className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors"
                                                    disabled={isProcessing}
                                                    title={t('tags.confirmRename')}
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button 
                                                    onClick={handleCancelRename}
                                                    className="p-1.5 text-muted hover:bg-elevated rounded-md transition-colors"
                                                    disabled={isProcessing}
                                                    title={t('tags.cancelRename')}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-content font-medium truncate">{tag}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface text-muted px-2 py-0.5 rounded-md border border-content/15 shrink-0">
                                                {t('tags.itemCount', { count })}
                                            </span>
                                        </>
                                    )}
                                </div>
                                
                                {editingTag?.oldName !== tag && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button 
                                            onClick={() => handleStartRename(tag)}
                                            className="p-2 text-muted hover:text-content hover:bg-elevated rounded-lg transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                                            title={t('tags.rename')}
                                            disabled={isProcessing}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(tag, count)}
                                            className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-danger/50"
                                            title={t('tags.delete')}
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
                <div className="absolute inset-0 bg-base flex items-center justify-center rounded-xl z-50 pointer-events-auto">
                    <div className="bg-base border border-content/25 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-content/90">{t('tags.updating')}</span>
                    </div>
                </div>
            )}
        </Modal>
    );
}
