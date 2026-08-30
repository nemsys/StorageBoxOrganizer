import { X, ChevronLeft, ChevronRight, Loader2, Trash2, Minimize2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../native/backHandler';
import { useScrollLock } from '../hooks/useScrollLock';
import { firebaseStorage } from '../services/firebaseStorage';
import { useTranslation } from '../translations';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

/**
 * Fullscreen image viewer.
 *
 * Receives image refs ({ id?, thumb, full? }). The thumbnail renders instantly
 * as a placeholder while the full-resolution image for the current slide is
 * fetched on demand (cache-first via firebaseStorage.getFullImage) and swapped
 * in. Legacy refs that already carry `full` inline skip the fetch.
 *
 * Zoom: pinch, double-tap and (on desktop) the scroll wheel. The whole point of
 * the product is reading what is in a box off a photo — small labels, book
 * spines, handwriting — and the stored full-res is ~1024px, which is unreadable
 * squeezed into a phone screen without magnification.
 *
 * `startIndex` opens the viewer on a specific slide (defaults to the first).
 * When `onDelete` is provided, a delete control is shown and invoked with the
 * current slide index — used by the edit modals to remove an image in place.
 */
export function FullscreenImageModal({ isOpen, onClose, imageRefs = [], itemName, startIndex = 0, onDelete }) {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fullMap, setFullMap] = useState({}); // index -> resolved full data URL
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
    // True while a pinch or a pan is in flight: the transform must follow the
    // finger exactly, so the easing transition is switched off for the duration.
    const [interacting, setInteracting] = useState(false);

    // Android hardware back closes the fullscreen viewer.
    useBackHandler(isOpen, onClose);
    // Shared, reference-counted: this viewer is often opened from inside an
    // edit modal, and both want the body locked.
    useScrollLock(isOpen);

    const imgRef = useRef(null);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const panStart = useRef(null);
    const pinchStart = useRef(null);
    const lastTap = useRef(0);
    const moved = useRef(false);

    const refs = Array.isArray(imageRefs) ? imageRefs.filter(Boolean) : [];
    const showNavigation = refs.length > 1;
    const isZoomed = zoom.scale > 1;

    const resetZoom = useCallback(() => setZoom({ scale: 1, x: 0, y: 0 }), []);

    // Keep the image from being dragged off-screen: at scale s the picture is
    // (s-1)/2 of its size larger than the frame on each side.
    const clampOffset = useCallback((scale, x, y) => {
        const el = imgRef.current;
        if (!el) return { x, y };
        // The element is now the whole frame, so under object-contain the
        // painted photo is that box shrunk to the image's aspect ratio. Pan
        // bounds have to come from the photo; taking them from the frame would
        // let a zoomed image be dragged out into the letterbox.
        const nw = el.naturalWidth || el.offsetWidth;
        const nh = el.naturalHeight || el.offsetHeight;
        const fit = Math.min(el.offsetWidth / nw, el.offsetHeight / nh) || 1;
        const maxX = (nw * fit * (scale - 1)) / 2;
        const maxY = (nh * fit * (scale - 1)) / 2;
        return {
            x: Math.min(maxX, Math.max(-maxX, x)),
            y: Math.min(maxY, Math.max(-maxY, y)),
        };
    }, []);

    const applyZoom = useCallback((scale, x, y) => {
        const next = Math.min(MAX_SCALE, Math.max(1, scale));
        if (next === 1) { resetZoom(); return; }
        const clamped = clampOffset(next, x, y);
        setZoom({ scale: next, ...clamped });
    }, [clampOffset, resetZoom]);

    const goToPrevious = useCallback(() => {
        resetZoom();
        setCurrentIndex((prev) => (prev === 0 ? refs.length - 1 : prev - 1));
    }, [refs.length, resetZoom]);

    const goToNext = useCallback(() => {
        resetZoom();
        setCurrentIndex((prev) => (prev === refs.length - 1 ? 0 : prev + 1));
    }, [refs.length, resetZoom]);

    // Reset state on open (start on the requested slide)
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(Math.min(Math.max(startIndex, 0), Math.max(refs.length - 1, 0)));
            setFullMap({});
            resetZoom();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, startIndex]);

    // Keep the index valid when the image list shrinks (e.g. after a delete);
    // close once the last image is gone.
    useEffect(() => {
        if (!isOpen) return;
        if (refs.length === 0) {
            onClose();
        } else if (currentIndex > refs.length - 1) {
            setCurrentIndex(refs.length - 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, refs.length]);

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
            if (e.key === 'Escape') { if (isZoomed) resetZoom(); else onClose(); }
            else if (e.key === 'ArrowLeft') goToPrevious();
            else if (e.key === 'ArrowRight') goToNext();
            else if (e.key === '+' || e.key === '=') applyZoom(zoom.scale + 0.5, zoom.x, zoom.y);
            else if (e.key === '-') applyZoom(zoom.scale - 0.5, zoom.x, zoom.y);
            else if (e.key === '0') resetZoom();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose, goToPrevious, goToNext, applyZoom, resetZoom, isZoomed, zoom]);

    const distanceBetween = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e) => {
        moved.current = false;
        setInteracting(true);
        if (e.touches.length === 2) {
            pinchStart.current = {
                distance: distanceBetween(e.touches),
                scale: zoom.scale,
            };
            touchStartX.current = null;
            return;
        }
        pinchStart.current = null;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: zoom.x, oy: zoom.y };
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && pinchStart.current) {
            moved.current = true;
            const ratio = distanceBetween(e.touches) / pinchStart.current.distance;
            applyZoom(pinchStart.current.scale * ratio, zoom.x, zoom.y);
            return;
        }
        // One finger only pans while zoomed in; otherwise it is a slide swipe.
        if (isZoomed && panStart.current && e.touches.length === 1) {
            moved.current = true;
            const dx = e.touches[0].clientX - panStart.current.x;
            const dy = e.touches[0].clientY - panStart.current.y;
            const next = clampOffset(zoom.scale, panStart.current.ox + dx, panStart.current.oy + dy);
            setZoom((z) => ({ ...z, ...next }));
        }
    };

    const handleTouchEnd = (e) => {
        pinchStart.current = null;
        setInteracting(false);

        // Double tap toggles between fit-to-screen and a readable magnification.
        if (!moved.current && e.changedTouches.length === 1) {
            const now = Date.now();
            if (now - lastTap.current < DOUBLE_TAP_MS) {
                lastTap.current = 0;
                if (isZoomed) resetZoom();
                else applyZoom(DOUBLE_TAP_SCALE, 0, 0);
                return;
            }
            lastTap.current = now;
        }

        if (isZoomed) { panStart.current = null; return; }
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

    const handleWheel = (e) => {
        applyZoom(zoom.scale - e.deltaY * 0.003, zoom.x, zoom.y);
    };

    if (!isOpen || refs.length === 0) return null;

    const currentRef = refs[currentIndex] || {};
    const currentSrc = fullMap[currentIndex] || currentRef.thumb;
    const showSpinner = loading && !fullMap[currentIndex];

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={itemName || t('photo.viewFullscreen')}
            onClick={onClose}
        >
            {/* Close button — offset below the status bar / notch */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
                className="absolute right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors z-20"
                title={t('photo.closeEsc')}
                aria-label={t('photo.closeFullscreen')}
            >
                <X size={24} />
            </button>

            {/* Delete button — only when editing (onDelete provided) */}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(currentIndex); }}
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
                    className="absolute left-4 p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors z-20"
                    title={t('photo.delete')}
                    aria-label={t('photo.delete')}
                >
                    <Trash2 size={24} />
                </button>
            )}

            {/* Reset zoom — the way back out that does not depend on knowing the
                double-tap gesture. */}
            {isZoomed && (
                <button
                    onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold rounded-full transition-colors z-20 backdrop-blur-sm"
                    title={t('photo.resetZoom')}
                    aria-label={t('photo.resetZoom')}
                >
                    <Minimize2 size={16} />
                    {Math.round(zoom.scale * 100)}%
                </button>
            )}

            {/* Image + overlay controls — stopPropagation so clicks here don't close */}
            {/* Full-bleed frame. It used to be capped at 90vw/90vh with the
                image left at its natural size, so anything smaller than the
                frame — a legacy photo with no full-size derivative, or just a
                small original — sat as a postage stamp in the middle of a black
                screen, and zooming scaled that stamp rather than filling the
                screen. The frame now takes the viewport and the image fills the
                frame; object-contain keeps the aspect ratio. Safe-area padding
                so a notch never lands on the photo. */}
            <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                    width: '100vw',
                    height: '100dvh',
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    touchAction: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isZoomed) resetZoom(); else applyZoom(DOUBLE_TAP_SCALE, 0, 0);
                }}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    ref={imgRef}
                    src={currentSrc}
                    alt={itemName}
                    className="w-full h-full object-contain select-none"
                    style={{
                        transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                        transition: interacting ? 'none' : 'transform 0.18s ease-out',
                        cursor: isZoomed ? 'grab' : 'zoom-in',
                    }}
                    draggable={false}
                />

                {/* Loading spinner while the full-res image is fetched */}
                {showSpinner && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 size={36} className="text-white/80 animate-spin" />
                    </div>
                )}

                {/* Navigation — buttons sit INSIDE the image area, never off-screen.
                    Hidden while zoomed in, where the same gestures mean panning. */}
                {showNavigation && !isZoomed && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all z-10 backdrop-blur-sm"
                            aria-label={t('photo.previous')}
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all z-10 backdrop-blur-sm"
                            aria-label={t('photo.next')}
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
                                    onClick={(e) => { e.stopPropagation(); resetZoom(); setCurrentIndex(i); }}
                                    className={`rounded-full transition-all ${i === currentIndex
                                        ? 'bg-white w-5 h-2'
                                        : 'bg-white/40 hover:bg-white/70 w-2 h-2'
                                    }`}
                                    aria-label={t('photo.goTo', { index: i + 1 })}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Item name */}
                {itemName && !isZoomed && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent pt-8 pb-3 px-4 rounded-b-lg pointer-events-none">
                        <p className="text-white text-base font-semibold text-center">{itemName}</p>
                    </div>
                )}
            </div>

            {/* Gesture hint — mobile only, and only while nothing is zoomed. */}
            {!isZoomed && (
                <p className="absolute bottom-4 text-slate-400 text-xs select-none pointer-events-none md:hidden px-6 text-center">
                    {showNavigation ? t('photo.swipeAndZoomHint') : t('photo.zoomHint')}
                </p>
            )}
        </div>,
        document.body
    );
}
