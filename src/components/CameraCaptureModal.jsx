import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw } from 'lucide-react';
import { makeDerivatives } from '../utils/imageUtils';
import { useBackHandler } from '../native/backHandler';

/**
 * In-app camera capture. Streams the device camera into a <video> element and
 * grabs a still frame on shutter — all without leaving the page. This avoids the
 * native `<input capture>` flow, which on low-RAM devices (e.g. ColorOS / OPPO)
 * gets the page discarded while the Camera app is foregrounded, losing the photo.
 *
 * Props:
 *   isOpen     - whether the camera is shown
 *   onClose    - called when the user cancels
 *   onCapture  - called with { thumb, full } derivatives of the captured photo
 */
export function CameraCaptureModal({ isOpen, onClose, onCapture }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

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

        (async () => {
            setError('');
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
            } catch (err) {
                if (cancelled) return;
                setError(
                    err && err.name === 'NotAllowedError'
                        ? 'Camera permission was denied. Allow camera access in your browser, or use the Gallery option.'
                        : 'Could not open the camera. Use the Gallery option instead.'
                );
            }
        })();

        return () => {
            cancelled = true;
            stopStream();
        };
    }, [isOpen, facingMode]);

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

    // Android hardware back closes the camera (web fallback overlay).
    useBackHandler(isOpen, handleClose);

    const handleCapture = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        setBusy(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
            // Reuse the shared pipeline so output (thumb + full) matches gallery uploads.
            const derivatives = await makeDerivatives(blob);
            onCapture(derivatives);
            handleClose();
        } catch {
            setError('Failed to capture the photo. Please try again.');
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
                    aria-label="Close camera"
                >
                    <X size={24} />
                </button>
                <span className="text-sm text-slate-300">Take Photo</span>
                <button
                    type="button"
                    onClick={() => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))}
                    className="btn-icon btn-ghost text-white"
                    aria-label="Switch camera"
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
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            {/* Shutter — shrink-0 so it always keeps its height/visibility;
                reserve safe-area room so it clears the gesture nav bar. */}
            <div
                className="shrink-0 flex items-center justify-center px-6 pt-4"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!!error || busy}
                    aria-label="Capture photo"
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
            </div>
        </div>,
        document.body
    );
}
