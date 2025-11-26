import { Tag, Package, Pencil, Trash2 } from 'lucide-react';

export function ItemCard({ item, onDelete, onEdit, boxName, onBoxClick, onImageClick }) {
    return (
        <div className="card flex flex-col h-full relative group">
            <div
                className="aspect-video w-full overflow-hidden bg-slate-800 relative cursor-pointer"
                onClick={() => {
                    if (item.image && onImageClick) {
                        onImageClick(item.image, item.name);
                    }
                }}
                title={item.image ? "Click to view fullscreen" : ""}
            >
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <span className="text-4xl">📦</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                {boxName && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onBoxClick) onBoxClick(item.boxId);
                        }}
                        className="flex items-center gap-1 mb-2 text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit"
                    >
                        <Package size={12} />
                        <span className="font-medium underline">{boxName}</span>
                    </button>
                )}

                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                        <p className="text-sm text-slate-300 mb-3">{item.description}</p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                className="p-1.5 bg-blue-500/80 text-white rounded-full hover:bg-blue-600 transition-colors"
                                title="Edit Item"
                            >
                                <Pencil size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                title="Delete Item"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {item.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
                                <Tag size={10} /> {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
