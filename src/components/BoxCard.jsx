import { Package, ZoomIn, MapPin, Search, Tag } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useTranslation } from '../translations';

// Matches ItemCard: at two columns on a 360px phone the card is one chip wide.
const VISIBLE_TAGS = 2;
const VISIBLE_TAGS_NARROW = 1;

export function BoxCard({ box, onClick, onImageClick, onTagClick, itemCount = 0 }) {
    const { t } = useTranslation();
    const tags = box.tags || [];
    // Browse from inline thumbnails; full-res is fetched on demand (fullscreen).
    const imageRefs = getImageRefs(box);
    const displayImages = refsToThumbs(imageRefs);

    const hasImages = displayImages.length > 0;
    const open = () => { if (typeof onClick === 'function') onClick(box); };

    return (
        <div
            onClick={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
            role="button"
            tabIndex={0}
            aria-label={box.name}
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden bg-base"
        >
            {/* Image Area — the whole thing opens the box. Zoom is the small
                button in the corner; it used to be an invisible full-cover
                overlay, which on a touch screen swallowed the tap that was
                meant to open the box. */}
            <div
                className="w-full bg-surface relative overflow-hidden"
                style={{ aspectRatio: '4 / 3', height: 'auto' }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={box.name}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={false}
                    showCount={false}
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
                            onImageClick(imageRefs, box.name, 0);
                        }}
                        className="zoom-btn"
                        title={t('photo.viewFullscreen')}
                        aria-label={t('box.viewFullscreen', { name: box.name })}
                    >
                        <ZoomIn size={16} />
                    </button>
                )}

                {/* Overlay Gradient */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 10,
                        background: 'linear-gradient(to top, rgba(var(--color-bg-rgb), 0.9) 0%, rgba(var(--color-bg-rgb), 0.2) 50%, transparent 100%)'
                    }}
                />

                {/* Item Count Badge. The number alone: the word only repeated
                    what a grid of boxes already says, and on a narrow card it
                    was the widest thing over the photo. role="img" + aria-label
                    is what keeps the meaning for a screen reader — a bare digit
                    would otherwise be read as a bare digit. */}
                <div
                    className="badge badge-count absolute z-20 bottom-2 right-2 pointer-events-none"
                    role="img"
                    aria-label={t('box.itemCount', { count: itemCount })}
                >
                    <span aria-hidden="true">{itemCount}</span>
                </div>

                {/* Where the box actually is. The grid's whole job is to get you
                    to the right box; without this it stops one step short. */}
                {box.location && (
                    <div
                        className="badge badge-place absolute z-20 bottom-2 left-2 pointer-events-none"
                        role="img"
                        aria-label={t('box.locatedAt', { location: box.location })}
                    >
                        <MapPin size={11} className="shrink-0" aria-hidden="true" />
                        <span aria-hidden="true">{box.location}</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                {/* Two lines: at 360px a single line cuts about half of a typical
                    Bulgarian box name, which is the main thing you recognise a
                    box by in the grid. */}
                <h3 className="text-[15px] font-semibold text-content line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {box.name}
                </h3>
                <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                    {box.description || t('common.noDescription')}
                </p>

                {/* Everything that hangs off the bottom of the card, in one
                    block, so whichever parts are present stay pinned together
                    below the description. */}
                {(box.matchedItems?.length > 0 || tags.length > 0) && (
                    <div className="mt-auto pt-3 space-y-2 min-w-0">
                        {/* Why this box is in the results — it matched on
                            something inside it, not on anything printed above.
                            Without the line the box reads as a false positive. */}
                        {box.matchedItems?.length > 0 && (
                            <p
                                className="box-match"
                                title={t('box.matchedItems', { names: box.matchedItems.join(', ') })}
                            >
                                <Search size={11} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{box.matchedItems[0]}</span>
                                {box.matchedItems.length > 1 && (
                                    <span className="shrink-0">+{box.matchedItems.length - 1}</span>
                                )}
                            </p>
                        )}

                        {/* Same one-line tag row as an item card — the two cards
                            are deliberately the same object. */}
                        {tags.length > 0 && (
                            <div className="flex flex-nowrap gap-2">
                                {tags.slice(0, VISIBLE_TAGS).map((tag, index) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                        className={`tag-chip shrink min-w-0 ${index >= VISIBLE_TAGS_NARROW ? 'hidden sm:inline-flex' : ''}`}
                                        title={t('tags.filterBy', { tag })}
                                    >
                                        <Tag size={10} className="mr-1 shrink-0" />
                                        <span className="min-w-0 truncate">{tag}</span>
                                    </button>
                                ))}
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
                )}
            </div>
        </div>
    );
}
