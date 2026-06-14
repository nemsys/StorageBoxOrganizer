import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { makeDerivatives } from '../utils/imageUtils';

const isNative = Capacitor.isNativePlatform();

/**
 * Unified "take a photo" entry point used by every image modal.
 *
 * - Native (Capacitor): uses the real device camera via @capacitor/camera. The
 *   capture happens in a native activity, so the WebView is never discarded and
 *   the photo is reliably returned — fixing the low-RAM page-discard bug.
 * - Web/PWA: falls back to the in-page getUserMedia camera (CameraCaptureModal)
 *   by exposing `cameraOpen` / `setCameraOpen`.
 *
 * Either path yields { thumb, full } derivatives passed to `onCapture`,
 * matching the gallery-upload pipeline (WebP thumb + full).
 *
 * @param {(derivatives: {thumb: string, full: string}) => void} onCapture
 */
export function usePhotoCapture(onCapture) {
    const [cameraOpen, setCameraOpen] = useState(false);

    const takePhoto = useCallback(async () => {
        if (!isNative) {
            setCameraOpen(true);
            return;
        }
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                correctOrientation: true,
                // Uri is lighter than DataUrl (no huge base64 across the bridge),
                // which lowers memory pressure on low-RAM devices.
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera,
            });
            if (!photo || !photo.webPath) return;
            // Always downscale through the shared pipeline so the stored bytes
            // stay small (Firestore caps documents at ~1MB) and match gallery
            // uploads. Some devices ignore the camera's width hint and return a
            // full-resolution photo, which on its own can exceed the limit.
            const blob = await fetch(photo.webPath).then((r) => r.blob());
            const derivatives = await makeDerivatives(blob);
            if (derivatives) onCapture(derivatives);
        } catch {
            // User cancelled or denied — nothing to do.
        }
    }, [onCapture]);

    return { isNative, takePhoto, cameraOpen, setCameraOpen };
}
