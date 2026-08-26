import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../translations';

export function ImageSlider({ images, alt, onImageClick, className = '', showNavigation: showNavigationProp = true, fit = 'contain' }) {
    const { t } = useTranslation();
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

    const handleImageClick = (e) => {
        if (onImageClick) {
            e?.stopPropagation();
            onImageClick(images, alt);
        }
    };

    // Only show navigation if there's more than one image AND showNavigationProp is true
    const showNavigation = images.length > 1 && showNavigationProp;

    return (
        <div className={`relative w-full h-full ${className}`}>
            {/* Main Image */}
            <div
                className="w-full h-full overflow-hidden rounded-lg bg-surface"
                onClick={handleImageClick}
            >
                <img
                    src={images[currentIndex]}
                    alt={`${alt} - ${currentIndex + 1}`}
                    className={`w-full h-full cursor-pointer object-${fit}`}
                />
            </div>

            {showNavigation && (
                <>
                    {/* Previous Button */}
                    <button
                        onClick={goToPrevious}
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                        className="absolute left-2 p-2 bg-base text-content rounded-full hover:bg-surface transition-all z-50 opacity-100 hover:scale-110"
                        aria-label={t('photo.previous')}
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={goToNext}
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                        className="absolute right-2 p-2 bg-base text-content rounded-full hover:bg-surface transition-all z-50 opacity-100 hover:scale-110"
                        aria-label={t('photo.next')}
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                        {images.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => goToSlide(index, e)}
                                className={`rounded-full transition-all ${index === currentIndex
                                    ? 'bg-white w-6 h-2.5'
                                    : 'bg-white/50 hover:bg-white/75 w-2.5 h-2.5'
                                    }`}
                                aria-label={t('photo.goTo', { index: index + 1 })}
                            />
                        ))}
                    </div>

                    {/* Image Counter */}
                    <div className="absolute top-2 right-2 bg-base text-content text-xs px-2 py-1 rounded-full z-50">
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
    );
}
