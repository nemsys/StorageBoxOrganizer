import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FullscreenImageModal({ isOpen, onClose, imageUrl, images, itemName }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Determine which images to display
    const displayImages = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Reset to first image when opening
            setCurrentIndex(0);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                goToPrevious();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, currentIndex, displayImages.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    if (!isOpen || displayImages.length === 0) return null;

    const showNavigation = displayImages.length > 1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors z-10"
                title="Close (Esc)"
            >
                <X size={24} />
            </button>

            <div
                className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={displayImages[currentIndex]}
                    alt={itemName}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />

                {showNavigation && (
                    <>
                        {/* Previous Button */}
                        <button
                            onClick={goToPrevious}
                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                            className="absolute -left-16 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all z-10"
                            aria-label="Previous image"
                        >
                            <ChevronLeft size={32} />
                        </button>

                        {/* Next Button */}
                        <button
                            onClick={goToNext}
                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                            className="absolute -right-16 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all z-10"
                            aria-label="Next image"
                        >
                            <ChevronRight size={32} />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute top-4 left-4 bg-slate-900 text-white text-sm px-3 py-1 rounded-full">
                            {currentIndex + 1} / {displayImages.length}
                        </div>
                    </>
                )}

                {itemName && (
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-900 p-4 rounded-b-lg">
                        <p className="text-white text-lg font-semibold text-center">{itemName}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
