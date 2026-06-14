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
            {/* Top bar — keep clear of the status bar / notch */}
            <div
                className="flex items-center justify-between px-4 pb-4 text-white"
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

            {/* Preview */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
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

            {/* Shutter — reserve safe-area room so it clears the gesture nav bar */}
            <div
                className="flex items-center justify-center px-6 pt-4"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!!error || busy}
                    className="w-16 h-16 rounded-full bg-white ring-4 ring-white/40 border-4 border-slate-900 disabled:opacity-40 active:scale-95 transition-transform"
                    aria-label="Capture photo"
                />
            </div>
        </div>,
        document.body
    );
}
