import { Package, Pencil, Trash2 } from 'lucide-react';

export function BoxCard({ box, onClick, onDelete, onEdit }) {
    return (
        <div
            onClick={(e) => {
                // if the click originated inside the delete or edit button, ignore and do not open the box
                if (e.target && e.target.closest && (e.target.closest('[data-delete-button]') || e.target.closest('[data-edit-button]'))) {
                    return;
                }
                if (typeof onClick === 'function') onClick(box);
            }}
            className="card group cursor-pointer flex flex-col h-full"
        >
            <div className="aspect-square w-full overflow-hidden bg-slate-800 relative">
                {box.image ? (
                    <img
                        src={box.image}
                        alt={box.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Package size={48} />
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{box.name}</h3>
                        <p className="text-sm text-slate-300 line-clamp-2">{box.description}</p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                        {onEdit && (
                            <button
                                type="button"
                                data-edit-button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (typeof onEdit === 'function') onEdit(box);
                                }}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                title="Edit Box"
                            >
                                <Pencil size={16} />
                            </button>
                        )}

                        {onDelete && (
                            <button
                                type="button"
                                data-delete-button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked for box:', box.id);
                                    if (typeof onDelete === 'function') onDelete(box.id);
                                }}
                                className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                title="Delete Box"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
