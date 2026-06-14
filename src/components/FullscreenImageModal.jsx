import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../native/backHandler';
import { firebaseStorage } from '../services/firebaseStorage';

/**
 * Fullscreen image viewer.
 *
 * Receives image refs ({ id?, thumb, full? }). The thumbnail renders instantly
 * as a placeholder while the full-resolution image for the current slide is
 * fetched on demand (cache-first via firebaseStorage.getFullImage) and swapped
 * in. Legacy refs that already carry `full` inline skip the fetch.
 */
export function FullscreenImageModal({ isOpen, onClose, imageRefs = [], itemName }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fullMap, setFullMap] = useState({}); // index -> resolved full data URL
    const [loading, setLoading] = useState(false);

    // Android hardware back closes the fullscreen viewer.
    useBackHandler(isOpen, onClose);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    const refs = Array.isArray(imageRefs) ? imageRefs.filter(Boolean) : [];
    const showNavigation = refs.length > 1;

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? refs.length - 1 : prev - 1));
    }, [refs.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev === refs.length - 1 ? 0 : prev + 1));
    }, [refs.length]);

    // Lock scroll + reset state on open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setCurrentIndex(0);
            setFullMap({});
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Resolve the full-resolution image for the current slide on demand.
    useEffect(() => {
        if (!isOpen) return;
        const ref = refs[currentIndex];
        if (!ref) return;
        if (fullMap[currentIndex]) return; // already resolved

        // Legacy/import refs carry the full inline — use directly.
        if (ref.full) {
            setFullMap((m) => ({ ...m, [currentIndex]: ref.full }));
            return;
        }
        if (!ref.id) return; // nothing to fetch; thumb stays

        let cancelled = false;
        setLoading(true);
        firebaseStorage.getFullImage(ref.id)
            .then((full) => {
                if (cancelled) return;
                if (full) setFullMap((m) => ({ ...m, [currentIndex]: full }));
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentIndex, refs.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goToPrevious();
            else if (e.key === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose, goToPrevious, goToNext]);

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;

        // Only treat as horizontal swipe if X movement dominates
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
            if (deltaX < 0) goToNext();
            else goToPrevious();
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    if (!isOpen || refs.length === 0) return null;

    const currentRef = refs[currentIndex] || {};
    const currentSrc = fullMap[currentIndex] || currentRef.thumb;
    const showSpinner = loading && !fullMap[currentIndex];

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors z-20"
                title="Close (Esc)"
                aria-label="Close fullscreen"
            >
                <X size={24} />
            </button>

            {/* Image + overlay controls — stopPropagation so clicks here don't close */}
            <div
                className="relative flex items-center justify-center"
                style={{ maxWidth: '90vw', maxHeight: '90vh', width: '100%' }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    src={currentSrc}
                    alt={itemName}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
                    draggable={false}
                />

                {/* Loading spinner while the full-res image is fetched */}
                {showSpinner && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 size={36} className="text-white/80 animate-spin" />
                    </div>
                )}

                {/* Navigation — buttons sit INSIDE the image area, never off-screen */}
                {showNavigation && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all z-10 backdrop-blur-sm"
                            aria-label="Previous image"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all z-10 backdrop-blur-sm"
                            aria-label="Next image"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Counter */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-xs md:text-sm px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                            {currentIndex + 1} / {refs.length}
                        </div>

                        {/* Dot indicators */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                            {refs.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                                    className={`rounded-full transition-all ${i === currentIndex
                                        ? 'bg-white w-5 h-2'
                                        : 'bg-white/40 hover:bg-white/70 w-2 h-2'
                                    }`}
                                    aria-label={`Go to image ${i + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Item name */}
                {itemName && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent pt-8 pb-3 px-4 rounded-b-lg pointer-events-none">
                        <p className="text-white text-base font-semibold text-center">{itemName}</p>
                    </div>
                )}
            </div>

            {/* Swipe hint — shown briefly on mobile touch devices */}
            {showNavigation && (
                <p className="absolute bottom-4 text-slate-500 text-xs select-none pointer-events-none md:hidden">
                    Swipe to navigate
                </p>
            )}
        </div>,
        document.body
    );
}
