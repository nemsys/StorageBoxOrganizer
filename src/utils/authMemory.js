/**
 * Which way the sign-in screen opens.
 *
 * It used to open on "Welcome back" for everyone, including someone reaching
 * the app for the very first time — who then had to find the small "Sign up"
 * link first. The device now remembers that someone has signed in on it, and
 * only then opens on sign-in; a fresh device, browser profile or install opens
 * on sign-up. The wrong guess (an existing user on a new device) is recovered in
 * AuthModal: "email already in use" offers to switch to sign-in, keeping what
 * was typed.
 *
 * A link can force the mode with `?auth=signup` or `?auth=signin` — the landing
 * page's "Sign up" step does, since whoever follows it is there to register.
 */

const KEY = 'sbo_signed_in_before';

export function rememberSignedIn() {
    try {
        localStorage.setItem(KEY, '1');
    } catch {
        // Storage blocked (private mode): the screen just keeps opening on sign-up.
    }
}

function hasSignedInBefore() {
    try {
        return localStorage.getItem(KEY) === '1';
    } catch {
        return false;
    }
}

/** true → open on sign-up, false → open on sign-in. */
export function initialSignUpMode() {
    const hint = new URLSearchParams(window.location.search).get('auth');
    if (hint === 'signup') return true;
    if (hint === 'signin') return false;
    return !hasSignedInBefore();
}
