import { Package, Edit, Trash2, Tag, ChevronRight } from 'lucide-react';
import { ImageSlider } from './ImageSlider';

export function ItemCard({ item, onDelete, onEdit, boxName, onBoxClick, onImageClick, showNavigation = false }) {
    // Prepare images array
    let displayImages = [];
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        displayImages = item.images;
    } else if (item.image) {
        displayImages = [item.image];
    }
    return (
        <div className="card flex flex-col h-full relative group">
            {/* Image Area */}
            <div
                className="w-full bg-slate-800 relative group overflow-hidden"
                style={{
                    aspectRatio: '4 / 3',
                    height: 'auto'
                }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={item.name}
                    onImageClick={onImageClick && displayImages.length > 0 ? () => onImageClick(displayImages, item.name, item) : undefined}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={showNavigation}
                    fit="cover"
                />
                {displayImages.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Package size={48} />
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 pointer-events-none" />

                {/* Option A — Pill Badge (in-box view: boxName present, no navigation) */}
                {boxName && !onBoxClick && (
                    <div
                        className="absolute z-20 flex items-center gap-1"
                        style={{
                            bottom: '10px',
                            left: '10px',
                            padding: '4px 10px',
                            backgroundColor: 'rgba(15, 23, 42, 0.82)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '8px',
                            fontSize: '10px',
                            color: 'var(--color-primary)',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <Package size={10} />
                        <span>{boxName}</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col h-28">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</h3>
                        <p className="text-sm text-slate-300 mb-3 line-clamp-1">{item.description}</p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                title="Edit Item"
                            >
                                <Edit size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
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

            {/* Option C — Footer Row (All Items / search view: boxName present + navigation available) */}
            {boxName && onBoxClick && (
                item.boxId ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBoxClick(item.boxId);
                        }}
                        className="flex items-center gap-2 w-full text-left transition-colors"
                        style={{
                            padding: '8px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            backgroundColor: 'rgba(30, 41, 59, 0.4)',
                            color: '#94a3b8',
                            minHeight: '38px',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        <Package size={12} className="shrink-0" />
                        <span style={{ fontSize: '11px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {boxName}
                        </span>
                        <ChevronRight size={12} className="shrink-0" style={{ opacity: 0.5 }} />
                    </button>
                ) : (
                    <div
                        className="flex items-center gap-2 w-full"
                        style={{
                            padding: '8px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            backgroundColor: 'rgba(30, 41, 59, 0.3)',
                            color: '#475569',
                            minHeight: '38px',
                        }}
                    >
                        <Package size={12} className="shrink-0" />
                        <span style={{ fontSize: '11px', fontWeight: 500 }}>Unassigned</span>
                    </div>
                )
            )}
        </div>
    );
}
