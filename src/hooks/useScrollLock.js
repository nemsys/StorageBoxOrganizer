import { useEffect } from 'react';

/**
 * Body scroll lock, reference-counted.
 *
 * Modals nest: opening the fullscreen viewer from inside the edit modal means
 * two components want the lock at once. With each of them setting
 * `body.style.overflow` on its own, closing the inner one released the scroll
 * while the outer modal was still up. Counting the holders fixes that — the
 * body is only unlocked when the last one lets go.
 */
let holders = 0;
let previousOverflow = '';

export function useScrollLock(active) {
    useEffect(() => {
        if (!active) return;

        if (holders === 0) {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        holders += 1;

        return () => {
            holders -= 1;
            if (holders === 0) {
                document.body.style.overflow = previousOverflow;
            }
        };
    }, [active]);
}
