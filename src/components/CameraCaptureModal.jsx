import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Loader2, RotateCcw, Check } from 'lucide-react';
import { makeDerivatives } from '../utils/imageUtils';
import { useBackHandler } from '../native/backHandler';
import { useTranslation } from '../translations';

/**
 * In-app camera capture. Streams the device camera into a <video> element and
 * grabs a still frame on shutter — all without leaving the page. This avoids the
 * native `<input capture>` flow, which on low-RAM devices (e.g. ColorOS / OPPO)
 * gets the page discarded while the Camera app is foregrounded, losing the photo.
 *
 * The shutter does not hand the photo over straight away: the frame is shown
 * full-screen first, with Retake and Use. The form behind it only has room for
 * a thumbnail, and a blurred or badly framed shot is cheaper to redo while the
 * camera is still open than to find later.
 *
 * Props:
 *   isOpen     - whether the camera is shown
 *   onClose    - called when the user cancels
 *   onCapture  - called with { thumb, full } derivatives of the captured photo
 */
export function CameraCaptureModal({ isOpen, onClose, onCapture }) {
    const { t } = useTranslation();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // True once the stream is actually rendering frames. Until then we cover the
    // <video> (which briefly shows the WebView's default play-poster icon) with
    // a loading spinner.
    const [ready, setReady] = useState(false);
    // The captured { thumb, full } awaiting Retake / Use; null while live.
    const [captured, setCaptured] = useState(null);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    // Start the stream when opened (or when the camera is flipped); always stop
    // it on cleanup so the camera indicator is released.
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        // Reset transient capture state every time the camera (re)opens. The
        // modal component stays mounted across opens (it just renders null when
        // closed), so without this a previous successful capture would leave
        // `busy` stuck true and disable the shutter on the next open — exactly
        // the "second photo does nothing" bug.
        setBusy(false);
        setError('');
        setReady(false);
        setCaptured(null);

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
                // Warm up the WebView's image encoders once on open. The first
                // JPEG/WebP encode after page load is slow (codec init), which
                // made the first capture stall for seconds with no feedback;
                // priming with a tiny throwaway encode makes the real capture
                // fast. Fire-and-forget.
                try {
                    const warm = document.createElement('canvas');
                    warm.width = warm.height = 8;
                    warm.getContext('2d').fillRect(0, 0, 8, 8);
                    warm.toDataURL('image/webp', 0.7);
                    warm.toBlob(() => {}, 'image/jpeg', 0.9);
                } catch { /* best-effort */ }
            } catch (err) {
                if (cancelled) return;
                setError(
                    err && err.name === 'NotAllowedError'
                        ? t('camera.denied')
                        : t('camera.failed')
                );
            }
        })();

        return () => {
            cancelled = true;
            stopStream();
        };
    }, [isOpen, facingMode, t]);

    // Lock background scroll while the camera is open.
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    const handleClose = () => {
        stopStream();
        onClose();
    };

    const handleRetake = () => {
        setCaptured(null);
        setBusy(false);
    };

    const handleUse = () => {
        onCapture(captured);
        handleClose();
    };

    // Android hardware back leaves the review for the live camera, and closes
    // the camera from there.
    useBackHandler(isOpen, captured ? handleRetake : handleClose);

    const handleCapture = async () => {
        const video = videoRef.current;
        if (!video || busy) return;
        setBusy(true);
        try {
            // The first tap right after opening can land before the <video>
            // reports its dimensions (metadata not parsed yet), even when a
            // frame is already visible. Wait for it instead of silently
            // no-opping, so a single tap always captures.
            if (!video.videoWidth) {
                await new Promise((resolve) => {
                    let settled = false;
                    const done = () => { if (!settled) { settled = true; resolve(); } };
                    video.addEventListener('loadeddata', done, { once: true });
                    setTimeout(done, 2000); // safety net
                });
            }
            if (!video.videoWidth) {
                setError(t('camera.starting'));
                setBusy(false);
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            // Encode the frame to a data URL and run it through the shared
            // pipeline (thumb + full), matching gallery uploads. toDataURL is
            // synchronous, avoiding the toBlob callback that could stall.
            const frame = canvas.toDataURL('image/jpeg', 0.9);
            const derivatives = await makeDerivatives(frame);
            if (!derivatives) throw new Error('encode failed');
            setCaptured(derivatives);
        } catch {
            setError(t('camera.captureFailed'));
            setBusy(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
            {/* Top bar — keep clear of the status bar / notch. shrink-0 so it
                always keeps its height and never gets squeezed by the preview. */}
            <div
                className="shrink-0 flex items-center justify-between px-4 pb-4 text-white"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            >
                <button
                    type="button"
                    onClick={handleClose}
                    className="btn-icon btn-ghost text-white"
                    aria-label={t('camera.close')}
                >
                    <X size={24} />
                </button>
                <span className="text-sm text-slate-300">{t('photo.take')}</span>
                <button
                    type="button"
                    onClick={() => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))}
                    disabled={!!captured}
                    className={`btn-icon btn-ghost text-white ${captured ? 'invisible' : ''}`}
                    aria-label={t('camera.switch')}
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Preview — min-h-0 is essential: without it the <video>'s intrinsic
                (camera-resolution) height expands this flex item and pushes the
                shutter off-screen on some devices. min-h-0 lets it shrink to the
                space left after the fixed top bar + shutter. */}
            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden"
                style={{ minHeight: 0 }}
            >
                {error ? (
                    <p className="p-6 text-center text-slate-300 max-w-sm">{error}</p>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onPlaying={() => setReady(true)}
                        className="w-full h-full object-contain"
                    />
                )}

                {/* Loading / capturing spinner. Shown while the camera is
                    starting (covers the WebView's default video play-poster) and
                    while a captured frame encodes, so the UI never looks broken
                    or unresponsive. Opaque before the first frame, translucent
                    over the live preview during capture. */}
                {/* Review — over the still-running stream, so Retake is instant. */}
                {captured && (
                    <img
                        src={captured.full || captured.thumb}
                        alt={t('camera.review')}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                )}

                {!error && !captured && (busy || !ready) && (
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${ready ? 'bg-black/40' : 'bg-black'}`}>
                        <Loader2 size={44} className="animate-spin text-white" />
                    </div>
                )}
            </div>

            {/* Shutter — shrink-0 so it always keeps its height/visibility;
                reserve safe-area room so it clears the gesture nav bar. */}
            <div
                className="shrink-0 flex items-center justify-center px-6 pt-4"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
                {captured ? (
                    <div className="flex w-full max-w-sm gap-3">
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                        >
                            <RotateCcw size={18} />
                            {t('camera.retake')}
                        </button>
                        <button
                            type="button"
                            onClick={handleUse}
                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-white hover:bg-slate-200 text-slate-900 font-semibold"
                        >
                            <Check size={18} />
                            {t('camera.use')}
                        </button>
                    </div>
                ) : (
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!!error || busy}
                    aria-label={t('camera.capture')}
                    className="active:scale-95"
                    style={{
                        width: '4.5rem',
                        height: '4.5rem',
                        borderRadius: '9999px',
                        backgroundColor: '#ffffff',
                        border: '4px solid #0f172a',
                        // Outer white ring (replaces the undefined ring-* utilities).
                        boxShadow: '0 0 0 4px rgba(255,255,255,0.45)',
                        opacity: (!!error || busy) ? 0.4 : 1,
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                    }}
                />
                )}
            </div>
        </div>,
        document.body
    );
}
