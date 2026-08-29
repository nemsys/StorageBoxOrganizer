import { Package, PackageMinus, Edit, Trash2, Tag, ChevronRight, ZoomIn, Pencil } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { OverflowMenu } from './OverflowMenu';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useTranslation } from '../translations';

// How many tag chips fit before the card starts hiding them behind a "+N".
const VISIBLE_TAGS = 2;

export function ItemCard({ item, onDelete, onRemoveFromBox, onEdit, boxName, onBoxClick, onImageClick, onTagClick, showNavigation = false }) {
    const { t } = useTranslation();
    // Browse from inline thumbnails; full-res is fetched on demand (fullscreen).
    const imageRefs = getImageRefs(item);
    const displayImages = refsToThumbs(imageRefs);
    const tags = item.tags || [];
    const shownTags = tags.slice(0, VISIBLE_TAGS);
    const hiddenTagCount = tags.length - shownTags.length;

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
                    onImageClick={onImageClick && displayImages.length > 0
                        ? (_images, _alt, index) => onImageClick(imageRefs, item.name, index)
                        : undefined}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={showNavigation}
                    fit="cover"
                />
                {displayImages.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                        <Package size={48} />
                    </div>
                )}

                {/* Visible zoom affordance — replaces the hover-only overlay,
                    which nothing revealed on a touch screen. */}
                {displayImages.length > 0 && onImageClick && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(imageRefs, item.name, 0);
                        }}
                        className="zoom-btn"
                        title={t('photo.viewFullscreen')}
                        aria-label={t('item.viewFullscreen', { name: item.name })}
                    >
                        <ZoomIn size={16} />
                    </button>
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

            {/* min-h, not a fixed h-28: the title is allowed two lines now, and
                a fixed height clipped the second one along with any tag row. */}
            <div className="p-4 flex flex-col flex-1 min-h-28">
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
                            <div className="flex items-start gap-1.5">
                                <h3 className="flex-1 min-w-0 text-[15px] font-semibold text-content line-clamp-2">{item.name}</h3>
                                {/* Permanent pencil: the hover tint that used to be
                                    the only hint does not exist on Android. */}
                                <span className="edit-hint mt-0.5" aria-hidden="true">
                                    <Pencil size={13} />
                                </span>
                            </div>
                            <p className="text-sm text-muted mb-3 line-clamp-1">{item.description}</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-semibold text-content line-clamp-2">{item.name}</h3>
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

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {shownTags.map((tag) => (
                            onTagClick ? (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                                    className="tag-chip"
                                    title={t('tags.filterBy', { tag })}
                                >
                                    <Tag size={10} className="mr-1" /> {tag}
                                </button>
                            ) : (
                                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-elevated text-muted flex items-center gap-1">
                                    <Tag size={10} /> {tag}
                                </span>
                            )
                        ))}
                        {hiddenTagCount > 0 && (
                            <span
                                className="text-xs px-2 py-1 rounded-full bg-elevated text-muted"
                                title={tags.join(', ')}
                            >
                                +{hiddenTagCount}
                            </span>
                        )}
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
