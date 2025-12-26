import { Package } from 'lucide-react';
import { ImageSlider } from './ImageSlider';

export function BoxCard({ box, onClick, itemCount = 0 }) {
    // Prepare images array
    let displayImages = [];
    if (box.images && Array.isArray(box.images) && box.images.length > 0) {
        displayImages = box.images;
    } else if (box.image) {
        displayImages = [box.image];
    }

    return (
        <div
            onClick={(e) => {
                if (typeof onClick === 'function') onClick(box);
            }}
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden"
        >
            {/* Image Area */}
            <div
                className="w-full bg-slate-800 relative group overflow-hidden"
                style={{ height: '160px' }}
            >
                <ImageSlider
                    images={displayImages}
                    alt={box.name}
                    className="w-full h-full"
                    showNavigation={false}
                    fit="cover"
                />
                {displayImages.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Package size={42} />
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                {/* Item Count Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>
            </div>

            <div className="p-3 flex flex-col flex-1 min-h-[80px]">
                <h3 className="text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 group-hover:text-primary transition-colors">
                    {box.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {box.description || 'No description'}
                </p>
            </div>
        </div>
    );
}
