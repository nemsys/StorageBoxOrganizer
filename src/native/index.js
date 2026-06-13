import { Capacitor } from '@capacitor/core';
import { runTopBackHandler } from './backHandler';

export const isNative = Capacitor.isNativePlatform();

/**
 * One-time native setup: status bar theming, hardware back-button routing, and
 * hiding the splash screen. No-op on the web build, so the same bundle runs in
 * the browser unchanged.
 */
export async function initNative() {
    if (!isNative) return;
    document.body.classList.add('native');

    const [{ StatusBar, Style }, { SplashScreen }, { App: CapApp }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
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

    try {
        await SplashScreen.hide();
    } catch {
        // Splash plugin may auto-hide; ignore.
    }
}
