import { Tag, Package, Pencil } from 'lucide-react';

export function ItemCard({ item, onDelete, onEdit, boxName, onBoxClick }) {
    return (
        <div className="card flex flex-col h-full relative group">
            <div className="aspect-video w-full overflow-hidden bg-slate-800 relative">
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
                <div className="absolute top-2 right-2 flex gap-2">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                            className="p-1.5 bg-blue-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                            title="Edit Item"
                        >
                            <Pencil size={16} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            className="p-1.5 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete Item"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                    )}
                </div>
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
                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                <p className="text-sm text-slate-300 mb-3 flex-1">{item.description}</p>

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
