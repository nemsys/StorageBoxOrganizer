import { Package, ZoomIn } from 'lucide-react';
import { ImageSlider } from './ImageSlider';

export function BoxCard({ box, onClick, onImageClick, itemCount = 0 }) {
    // Prepare images array
    let displayImages = [];
    if (box.images && Array.isArray(box.images) && box.images.length > 0) {
        displayImages = box.images;
    } else if (box.image) {
        displayImages = [box.image];
    }

    const hasImages = displayImages.length > 0;

    return (
        <div
            onClick={() => { if (typeof onClick === 'function') onClick(box); }}
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden bg-slate-900"
        >
            {/* Image Area */}
            <div
                className="w-full bg-slate-800 relative overflow-hidden"
                style={{ aspectRatio: '1 / 1', height: 'auto' }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={box.name}
                    className="absolute inset-0 w-full h-full"
                    showNavigation={false}
                    fit="cover"
                />

                {!hasImages && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                        <Package size={48} />
                    </div>
                )}

                {/* Clickable zoom overlay — only when images exist */}
                {hasImages && onImageClick && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation(); // prevent card navigation
                            onImageClick(displayImages, box.name);
                        }}
                        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.35)', cursor: 'zoom-in' }}
                        title="View fullscreen"
                        role="button"
                        aria-label={`View ${box.name} image fullscreen`}
                    >
                        <div className="p-2 bg-slate-900/70 rounded-full backdrop-blur-sm">
                            <ZoomIn size={22} className="text-white" />
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
                <div
                    className="absolute z-20 font-bold uppercase tracking-wider flex items-center justify-center pointer-events-none"
                    style={{
                        bottom: '12px',
                        right: '12px',
                        padding: '4px 10px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-bg)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        minWidth: '3.5rem'
                    }}
                >
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis mb-1 group-hover:text-primary transition-colors">
                    {box.name}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {box.description || 'No description'}
                </p>
            </div>
        </div>
    );
}
