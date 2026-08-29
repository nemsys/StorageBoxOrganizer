import { Capacitor } from '@capacitor/core';
import { runTopBackHandler } from './backHandler';

export const isNative = Capacitor.isNativePlatform();

let splashHidden = false;

/**
 * Dismiss the native splash. The plugin no longer auto-hides on a timer
 * (`launchAutoHide: false`), because a fixed duration is a guess: too short and
 * the app flashes an unpainted screen, too long and it sits on a screen that is
 * already ready. The web launch screen calls this the moment it paints, so the
 * PNG hands over to it instead of covering it.
 *
 * Safe to call repeatedly, before `initNative()` has finished, and on the web.
 */
export async function hideSplash() {
    if (!isNative || splashHidden) return;
    splashHidden = true;
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch {
        // Plugin missing or already hidden; nothing to undo.
    }
}

/**
 * One-time native setup: status bar theming and hardware back-button routing.
 * No-op on the web build, so the same bundle runs in the browser unchanged.
 */
export async function initNative() {
    if (!isNative) return;
    document.body.classList.add('native');

    const [{ StatusBar, Style }, { App: CapApp }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/app'),
    ]);

    // Light icons/text for our dark glassmorphism theme.
    try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
    } catch {
        // setBackgroundColor is unsupported on some configs; ignore.
    }

    // Android hardware back: close the frontmost overlay, else step back through
    // the app's pushState history, else leave the app. This reuses the existing
    // popstate-based routing in App.jsx — no navigation rewrite.
    CapApp.addListener('backButton', ({ canGoBack }) => {
        if (runTopBackHandler()) return;
        if (canGoBack) {
            window.history.back();
        } else {
            CapApp.exitApp();
        }
    });

    // Failsafe: if the app never gets far enough to call hideSplash() itself —
    // a failed bundle, a hung auth call — the splash must still come off rather
    // than stay on screen forever.
    setTimeout(hideSplash, 6000);
}
