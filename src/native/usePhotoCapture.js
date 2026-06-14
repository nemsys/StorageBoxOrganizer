import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Unified "take a photo" entry point used by every image modal.
 *
 * Capture is done **in-page** via the getUserMedia camera (`CameraCaptureModal`)
 * on every platform — native and web alike.
 *
 * Why not the native `@capacitor/camera`? On the native build it launches the
 * device's separate camera *app*, which backgrounds our WebView. Aggressive
 * OEMs (notably ColorOS / OPPO) then reclaim the WebView's renderer child
 * process; the WebView reports `onRenderProcessGone` and — historically —
 * killed the whole app, bouncing the user to the home screen and losing the
 * in-flight photo. Capturing inside the page never backgrounds the app, so the
 * renderer is never reaped and the photo is produced in-process and saved
 * reliably. (A native `onRenderProcessGone` handler in MainActivity now also
 * guards against renderer loss from any *other* backgrounding, e.g. the gallery
 * picker — defence in depth.)
 *
 * The in-page camera yields { thumb, full } derivatives via `onCapture`,
 * matching the gallery-upload pipeline.
 *
 * @param {(derivatives: {thumb: string, full: string}) => void} onCapture
 */
export function usePhotoCapture(onCapture) {
    // Kept in the signature for API compatibility with the modals; onCapture is
    // wired through <CameraCaptureModal onCapture=...>.
    void onCapture;
    const [cameraOpen, setCameraOpen] = useState(false);

    const takePhoto = useCallback(() => {
        // Always use the in-page camera so the WebView is never backgrounded.
        setCameraOpen(true);
    }, []);

    return { isNative, takePhoto, cameraOpen, setCameraOpen };
}
