import { useEffect } from 'react';

/**
 * A LIFO stack of "back" handlers (open overlays). The native hardware-back
 * button (wired in ./index.js) runs the topmost handler first, so pressing Back
 * closes the frontmost modal/sheet before navigating or exiting the app.
 */
const stack = [];

export function pushBackHandler(handler) {
    stack.push(handler);
    return () => {
        const i = stack.lastIndexOf(handler);
        if (i !== -1) stack.splice(i, 1);
    };
}

/** Run the topmost back handler. Returns true if one handled the event. */
export function runTopBackHandler() {
    const handler = stack[stack.length - 1];
    if (handler) {
        handler();
        return true;
    }
    return false;
}

/**
 * Register `onBack` as the active back handler while `active` is true. Used by
 * overlays so the Android back button (and our logic) can dismiss them.
 */
export function useBackHandler(active, onBack) {
    useEffect(() => {
        if (!active) return undefined;
        return pushBackHandler(onBack);
    }, [active, onBack]);
}
