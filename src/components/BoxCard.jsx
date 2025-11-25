import { Package } from 'lucide-react';

export function BoxCard({ box, onClick, onDelete }) {
    return (
        <div
            onClick={(e) => {
                // if the click originated inside the delete button, ignore and do not open the box
                if (e.target && e.target.closest && e.target.closest('[data-delete-button]')) {
                    return;
                }
                if (typeof onClick === 'function') onClick(box);
            }}
            className="card group cursor-pointer relative aspect-square flex flex-col"
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

            {box.image ? (
                <img
                    src={box.image}
                    alt={box.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                    <Package size={48} />
                </div>
            )}

            {onDelete && (
                <button
                    type="button"
                    data-delete-button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof onDelete === 'function') onDelete(box.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-30"
                    title="Delete Box"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-lg font-bold text-white mb-1 truncate">{box.name}</h3>
                <p className="text-sm text-slate-300 line-clamp-2">{box.description}</p>
            </div>
        </div>
    );
}
