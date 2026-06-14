import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Draft persistence for modal forms.
 *
 * On mobile, launching the camera pushes the page/app to the background.
 * Memory-constrained devices then discard it and reload (web) or kill and
 * cold-restart the app process (native) when the user returns, wiping all React
 * state (the open modal and the just-typed form data / images). These helpers
 * persist a modal's working state so the restart can restore it, making the
 * discard invisible.
 *
 * Backend differs by platform: the web build uses sessionStorage (tab-scoped,
 * cleared when the tab closes); the native build uses localStorage, because a
 * process kill wipes sessionStorage — localStorage survives the cold restart so
 * the in-progress edit is recovered.
 */

const PREFIX = 'sbo_draft_';

const store = Capacitor.isNativePlatform() ? window.localStorage : window.sessionStorage;

export function loadDraft(key) {
    try {
        const raw = store.getItem(PREFIX + key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveDraft(key, data) {
    try {
        store.setItem(PREFIX + key, JSON.stringify(data));
    } catch (e) {
        // Storage may be unavailable (private mode) or full (large base64 images
        // can exceed the quota). Persistence is best-effort, so fail quietly.
        console.warn('[draft] failed to persist', key, e);
    }
}

export function clearDraft(key) {
    try {
        store.removeItem(PREFIX + key);
    } catch {
        /* noop */
    }
}

/**
 * Persist an open modal's working form state and restore it when the modal next
 * opens with the same key (i.e. after a camera-induced page reload).
 *
 * @param {string} key       Stable per-entity key, e.g. `edit-item-<id>`.
 * @param {boolean} isOpen    Whether the modal is currently open.
 * @param {object} values     Current form values (the snapshot to persist).
 * @param {(draft: object) => void} onRestore  Applies a saved/default draft to state.
 * @param {() => object} getDefaults  Builds the initial values when no draft exists.
 */
export function useModalDraft(key, isOpen, values, onRestore, getDefaults) {
    const hydrated = useRef(false);
    // Keep the latest callbacks without making them effect dependencies, so
    // hydration runs exactly once per open rather than on every render.
    const onRestoreRef = useRef(onRestore);
    const getDefaultsRef = useRef(getDefaults);
    onRestoreRef.current = onRestore;
    getDefaultsRef.current = getDefaults;

    // Hydrate once each time the modal opens: restore a saved draft if present,
    // otherwise seed from defaults.
    useEffect(() => {
        if (!isOpen) {
            hydrated.current = false;
            return;
        }
        if (hydrated.current) return;
        const draft = loadDraft(key);
        onRestoreRef.current(draft || getDefaultsRef.current());
        hydrated.current = true;
    }, [isOpen, key]);

    // Persist on change while open (debounced so per-keystroke re-serialization
    // of base64 images doesn't cause input lag on low-end devices).
    const serialized = JSON.stringify(values);
    useEffect(() => {
        if (!isOpen || !hydrated.current) return;
        const t = setTimeout(() => saveDraft(key, values), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, key, serialized]);
}
