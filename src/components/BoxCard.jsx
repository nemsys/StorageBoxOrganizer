import { Package, MoreVertical, Pencil, Trash2, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function BoxCard({ box, onClick, onDelete, onEdit, onRemove }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    return (
        <div
            onClick={(e) => {
                // if the click originated inside the menu, ignore and do not open the box
                if (e.target && e.target.closest && e.target.closest('[data-menu-container]')) {
                    return;
                }
                if (typeof onClick === 'function') onClick(box);
            }}
            className={`card group cursor-pointer flex flex-col h-full relative ${isMenuOpen ? 'z-50' : 'z-0'}`}
            style={{ overflow: 'visible' }}
        >
            <div
                className="aspect-square w-full overflow-hidden bg-slate-800 relative"
                style={{ borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}
            >
                {box.image ? (
                    <img
                        src={box.image}
                        alt={box.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
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
                        <h3 className="text-lg font-bold text-white whitespace-normal break-words">{box.name}</h3>
                        <p className="text-sm text-slate-300 line-clamp-2">{box.description}</p>
                    </div>

                    <div className="relative" data-menu-container ref={menuRef}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(false);
                                            onEdit(box);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                                    >
                                        <Pencil size={14} />
                                        Edit box
                                    </button>
                                )}
                                {onRemove && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(false);
                                            onRemove(box.id);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Remove box
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(false);
                                            onDelete(box.id);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-slate-800"
                                    >
                                        <Trash2 size={14} />
                                        Delete box
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
