import { Package, ZoomIn } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';
import { useTranslation } from '../translations';

export function BoxCard({ box, onClick, onImageClick, itemCount = 0 }) {
    const { t } = useTranslation();
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
            </div>
        </div>
    );
}
