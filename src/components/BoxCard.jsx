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
            className="card group cursor-pointer flex flex-col h-full relative overflow-hidden bg-slate-900"
        >
            {/* Image Area */}
            <div
                className="w-full bg-slate-800 relative overflow-hidden aspect-[4/3] sm:aspect-video"
            >
                <ImageSlider
                    images={displayImages}
                    alt={box.name}
                    className="w-full h-full"
                    showNavigation={false}
                    fit="cover"
                />

                {displayImages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                        <Package size={48} />
                    </div>
                )}

                {/* Overlay Gradient - Higher z-index to stay above ImageSlider wrapper */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/20 to-transparent z-10" />

                {/* Item Count Badge - Higher z-index to stay on top */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-primary text-slate-950 rounded-lg shadow-lg z-20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center min-w-[3rem]">
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
