import { Package, PackageMinus, Edit, Trash2, Tag, ChevronRight, ZoomIn } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { OverflowMenu } from './OverflowMenu';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useTranslation } from '../translations';

// How many tag chips fit before the card starts hiding them behind a "+N".
// Two columns on a 360px phone leave a ~156px card, which is one chip wide.
const VISIBLE_TAGS = 2;
const VISIBLE_TAGS_NARROW = 1;

export function ItemCard({ item, onDelete, onRemoveFromBox, onEdit, boxName, onBoxClick, onImageClick, onTagClick }) {
    const { t } = useTranslation();
    // Browse from inline thumbnails; full-res is fetched on demand (fullscreen).
    const imageRefs = getImageRefs(item);
    const displayImages = refsToThumbs(imageRefs);
    const hasImages = displayImages.length > 0;
    const tags = item.tags || [];
    const shownTags = tags.slice(0, VISIBLE_TAGS);

    // The whole card opens the item, exactly as a box card opens the box.
    const open = () => { if (typeof onEdit === 'function') onEdit(item); };

    const menuItems = [
        onEdit && { id: 'edit', label: t('item.edit'), icon: <Edit size={18} />, onClick: () => onEdit(item) },
        (onEdit && (onRemoveFromBox || onDelete)) && { id: 'divider', isDivider: true },
        onRemoveFromBox && { id: 'remove', label: t('item.removeFromBox'), icon: <PackageMinus size={18} />, onClick: () => onRemoveFromBox(item.id) },
        onDelete && { id: 'delete', label: t('item.delete'), icon: <Trash2 size={18} />, danger: true, onClick: () => onDelete(item.id) },
    ].filter(Boolean);

    return (
        <div
            onClick={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
            role="button"
            tabIndex={0}
            aria-label={onEdit ? t('item.editAria', { name: item.name }) : item.name}
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden bg-base"
        >
            {/* Image Area — same contract as the box card: the photo opens the
                entity, the two visible corner buttons do the rest. The in-card
                slider arrows are gone with it; at two columns they collided with
                the zoom button and left no room for the photo itself. Several
                photos are announced by the count badge, browsed fullscreen. */}
            <div
                className="w-full bg-surface relative overflow-hidden"
                style={{ aspectRatio: '4 / 3', height: 'auto' }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={false}
                    fit="cover"
                />

                {!hasImages && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted">
                        <Package size={48} />
                    </div>
                )}

                {hasImages && onImageClick && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation(); // prevent card navigation
                            onImageClick(imageRefs, item.name, 0);
                        }}
                        className="zoom-btn"
                        title={t('photo.viewFullscreen')}
                        aria-label={t('item.viewFullscreen', { name: item.name })}
                    >
                        <ZoomIn size={16} />
                    </button>
                )}

                {/* Actions live over the photo, opposite the zoom button. Beside
                    the title they were 42px of a 156px card, which cut the name
                    to about eight Cyrillic characters. */}
                {menuItems.length > 0 && (
                    <OverflowMenu
                        label={t('item.actions')}
                        align="left"
                        buttonClassName="zoom-btn card-menu-btn"
                        items={menuItems}
                    />
                )}

                {/* Overlay Gradient */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 10,
                        background: 'linear-gradient(to top, rgba(var(--color-bg-rgb), 0.9) 0%, rgba(var(--color-bg-rgb), 0.2) 50%, transparent 100%)'
                    }}
                />
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-[15px] font-semibold text-content line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {item.name}
                </h3>
                {item.description && (
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                        {item.description}
                    </p>
                )}

                {/* One row, never two: a chip that does not fit is truncated,
                    so every card in a row keeps the same height. */}
                {tags.length > 0 && (
                    <div className="flex flex-nowrap gap-2 mt-auto pt-3">
                        {shownTags.map((tag, index) => {
                            // The second chip only exists once the card is wide
                            // enough for it; below `sm` the "+N" absorbs it.
                            const narrowHidden = index >= VISIBLE_TAGS_NARROW ? 'hidden sm:inline-flex' : '';
                            return onTagClick ? (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                                    className={`tag-chip shrink min-w-0 ${narrowHidden}`}
                                    title={t('tags.filterBy', { tag })}
                                >
                                    <Tag size={10} className="mr-1 shrink-0" />
                                    <span className="min-w-0 truncate">{tag}</span>
                                </button>
                            ) : (
                                <span
                                    key={tag}
                                    className={`text-xs px-2 py-1 rounded-full bg-elevated text-muted shrink min-w-0 items-center gap-1 ${narrowHidden || 'inline-flex'}`}
                                >
                                    <Tag size={10} className="shrink-0" />
                                    <span className="min-w-0 truncate">{tag}</span>
                                </span>
                            );
                        })}
                        {/* One counter per breakpoint: below `sm` it stands in
                            for every tag but the first, above it for the rest. */}
                        {tags.length > VISIBLE_TAGS_NARROW && (
                            <span className="tag-count shrink-0 inline-flex sm:hidden" title={tags.join(', ')}>
                                +{tags.length - VISIBLE_TAGS_NARROW}
                            </span>
                        )}
                        {tags.length > VISIBLE_TAGS && (
                            <span className="tag-count shrink-0 hidden sm:inline-flex" title={tags.join(', ')}>
                                +{tags.length - VISIBLE_TAGS}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Which box this is in — only in the all-items / search views, where
                that is not already on screen. Inside a box the name is in the
                header above, and repeating it on every card was clutter. */}
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
                        {/* The chevron is 14px of a name that has ~90px on a
                            phone; the row is still a button without it. */}
                        <ChevronRight size={14} className="shrink-0 opacity-50 hidden sm:block" />
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
