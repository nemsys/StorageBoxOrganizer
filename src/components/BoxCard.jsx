import { Package, ZoomIn } from 'lucide-react';
import { ImageSlider } from './ImageSlider';
import { getImageRefs, refsToThumbs } from '../utils/imageUtils';

export function BoxCard({ box, onClick, onImageClick, itemCount = 0 }) {
    // Browse from inline thumbnails; full-res is fetched on demand (fullscreen).
    const imageRefs = getImageRefs(box);
    const displayImages = refsToThumbs(imageRefs);

    const hasImages = displayImages.length > 0;

    return (
        <div
            onClick={() => { if (typeof onClick === 'function') onClick(box); }}
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden bg-base"
        >
            {/* Image Area */}
            <div
                className="w-full bg-surface relative overflow-hidden"
                style={{ aspectRatio: '4 / 3', height: 'auto' }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={box.name}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={false}
                    fit="cover"
                />

                {!hasImages && (
                    <div className="absolute inset-0 flex items-center justify-center text-content/40">
                        <Package size={48} />
                    </div>
                )}

                {/* Clickable zoom overlay — only when images exist */}
                {hasImages && onImageClick && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation(); // prevent card navigation
                            onImageClick(imageRefs, box.name);
                        }}
                        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.35)', cursor: 'zoom-in' }}
                        title="View fullscreen"
                        role="button"
                        aria-label={`View ${box.name} image fullscreen`}
                    >
                        <div className="p-2 bg-base/70 rounded-full backdrop-blur-sm">
                            <ZoomIn size={22} className="text-content" />
                        </div>
                    </div>
                )}

                {/* Overlay Gradient */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: hasImages && onImageClick ? 9 : 10, // sit below zoom overlay
                        background: 'linear-gradient(to top, rgba(var(--color-bg-rgb), 0.9) 0%, rgba(var(--color-bg-rgb), 0.2) 50%, transparent 100%)'
                    }}
                />

                {/* Item Count Badge */}
                <div className="badge badge-count absolute z-20 bottom-2 right-2 pointer-events-none">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-[15px] font-semibold text-content whitespace-nowrap overflow-hidden text-ellipsis mb-1 group-hover:text-primary transition-colors">
                    {box.name}
                </h3>
                <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                    {box.description || 'No description'}
                </p>
            </div>
        </div>
    );
}
