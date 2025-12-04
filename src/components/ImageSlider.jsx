import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ImageSlider({ images, alt, onImageClick, className = '' }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return null;
    }

    const goToPrevious = (e) => {
        e?.stopPropagation();
        e?.preventDefault();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = (e) => {
        e?.stopPropagation();
        e?.preventDefault();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const goToSlide = (index, e) => {
        e?.stopPropagation();
        e?.preventDefault();
        setCurrentIndex(index);
    };

    const handleImageClick = () => {
        if (onImageClick) {
            onImageClick(images[currentIndex], alt);
        }
    };

    // Only show navigation if there's more than one image
    const showNavigation = images.length > 1;

    return (
        <div className={`relative w-full h-full group ${className}`}>
            {/* Main Image */}
            <div
                className="w-full h-full overflow-hidden rounded-lg bg-slate-800"
                onClick={handleImageClick}
            >
                <img
                    src={images[currentIndex]}
                    alt={`${alt} - ${currentIndex + 1}`}
                    className="w-full h-full object-contain cursor-pointer"
                />
            </div>

            {showNavigation && (
                <>
                    {/* Previous Button */}
                    <button
                        onClick={goToPrevious}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all z-20"
                        aria-label="Previous image"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all z-20"
                        aria-label="Next image"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {images.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => goToSlide(index, e)}
                                className={`rounded-full transition-all ${index === currentIndex
                                        ? 'bg-white w-6 h-2.5'
                                        : 'bg-white/50 hover:bg-white/75 w-2.5 h-2.5'
                                    }`}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Image Counter */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-20">
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
    );
}
