import { Package, PackageMinus, Edit, Trash2, Tag, ChevronRight, ZoomIn } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { OverflowMenu } from './OverflowMenu';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useTranslation } from '../translations';

export function ItemCard({ item, onDelete, onRemoveFromBox, onEdit, boxName, onBoxClick, onImageClick, showNavigation = false }) {
    const { t } = useTranslation();
    // Browse from inline thumbnails; full-res is fetched on demand (fullscreen).
    const imageRefs = getImageRefs(item);
    const displayImages = refsToThumbs(imageRefs);
    return (
        <div className="card flex flex-col h-full relative group">
            {/* Image Area */}
            <div
                className="w-full bg-surface relative group overflow-hidden"
                style={{
                    aspectRatio: '4 / 3',
                    height: 'auto'
                }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={item.name}
                    onImageClick={onImageClick && displayImages.length > 0 ? () => onImageClick(imageRefs, item.name, item) : undefined}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={showNavigation}
                    fit="cover"
                />
                {displayImages.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-content/40">
                        <Package size={48} />
                    </div>
                )}

                {/* Clickable zoom overlay — only when images exist */}
                {displayImages.length > 0 && onImageClick && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(imageRefs, item.name);
                        }}
                        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.35)', cursor: 'zoom-in' }}
                        title={t('photo.viewFullscreen')}
                        role="button"
                        aria-label={t('item.viewFullscreen', { name: item.name })}
                    >
                        <div className="p-2 bg-base/70 rounded-full backdrop-blur-sm">
                            <ZoomIn size={22} className="text-content" />
                        </div>
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent opacity-60 pointer-events-none" />

                {/* Option A — Pill Badge (in-box view: boxName present, no navigation) */}
                {boxName && !onBoxClick && (
                    <div className="badge badge-box absolute z-20 bottom-2.5 left-2.5">
                        <Package size={12} />
                        <span>{boxName}</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col h-28">
                <div className="flex items-start justify-between gap-2 mb-1">
                    {onEdit ? (
                        <div
                            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(item); } }}
                            role="button"
                            tabIndex={0}
                            className="flex-1 min-w-0 cursor-pointer rounded-lg -mx-1 -mt-1 px-1 pt-1 hover:bg-primary/10 transition-colors"
                            title={t('item.edit')}
                            aria-label={t('item.editAria', { name: item.name })}
                        >
                            <h3 className="text-[15px] font-semibold text-content whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</h3>
                            <p className="text-sm text-muted mb-3 line-clamp-1">{item.description}</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-semibold text-content whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</h3>
                            <p className="text-sm text-muted mb-3 line-clamp-1">{item.description}</p>
                        </div>
                    )}

                    {(onEdit || onRemoveFromBox || onDelete) && (
                        <div className="flex-shrink-0">
                            <OverflowMenu
                                label={t('item.actions')}
                                buttonClassName="p-3 rounded-lg text-muted hover:bg-elevated hover:text-content transition-colors flex items-center justify-center"
                                items={[
                                    onEdit && { id: 'edit', label: t('item.edit'), icon: <Edit size={18} />, onClick: () => onEdit(item) },
                                    (onEdit && (onRemoveFromBox || onDelete)) && { id: 'divider', isDivider: true },
                                    onRemoveFromBox && { id: 'remove', label: t('item.removeFromBox'), icon: <PackageMinus size={18} />, onClick: () => onRemoveFromBox(item.id) },
                                    onDelete && { id: 'delete', label: t('item.delete'), icon: <Trash2 size={18} />, danger: true, onClick: () => onDelete(item.id) },
                                ].filter(Boolean)}
                            />
                        </div>
                    )}
                </div>

                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {item.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-elevated text-muted flex items-center gap-1">
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
                        className="card-footer card-footer--link"
                    >
                        <Package size={14} className="shrink-0" />
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {boxName}
                        </span>
                        <ChevronRight size={14} className="shrink-0 opacity-50" />
                    </button>
                ) : (
                    <div className="card-footer card-footer--static">
                        <Package size={14} className="shrink-0" />
                        <span>{t('box.unassigned')}</span>
                    </div>
                )
            )}
        </div>
    );
}
