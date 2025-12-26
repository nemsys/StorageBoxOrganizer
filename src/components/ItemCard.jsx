import { Package, MoreVertical, Edit, Trash2, Box, Tag } from 'lucide-react';
import { useState } from 'react';
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
                    aspectRatio: '16 / 10',
                    height: 'auto'
                }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={item.name}
                    onImageClick={onImageClick && displayImages.length > 0 ? () => onImageClick(displayImages, item.name) : undefined}
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
            </div>

            <div className="p-4 flex flex-col h-28">
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
        </div>
    );
}
