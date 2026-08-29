import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../translations';

// Firebase reports its own English text; map the codes we can actually hit onto
// translated messages and keep a generic fallback for everything else.
const AUTH_ERROR_KEYS = {
    'auth/invalid-email': 'auth.error.invalidEmail',
    'auth/invalid-credential': 'auth.error.invalidCredential',
    'auth/user-not-found': 'auth.error.userNotFound',
    'auth/wrong-password': 'auth.error.wrongPassword',
    'auth/email-already-in-use': 'auth.error.emailInUse',
    'auth/weak-password': 'auth.error.weakPassword',
    'auth/too-many-requests': 'auth.error.tooManyRequests',
    'auth/network-request-failed': 'auth.error.networkFailed',
};

export function AuthModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    // Losing the password used to mean losing the whole inventory: there was no
    // way back into an account from this screen. Firebase's reset email is free
    // on the Spark plan.
    const handleResetPassword = async () => {
        setError('');
        setNotice('');
        if (!email) {
            setError(t('auth.error.resetNeedsEmail'));
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            // Deliberately unconditional: Firebase hides whether the address is
            // registered, and so do we.
            setNotice(t('auth.resetSent', { email }));
        } catch (err) {
            console.error(err);
            setError(t(AUTH_ERROR_KEYS[err.code] ?? 'auth.error.generic'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        setLoading(true);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            onClose();
        } catch (err) {
            console.error(err);
            setError(t(AUTH_ERROR_KEYS[err.code] ?? 'auth.error.generic'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black animate-fade-in">
            <div className="bg-base border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface/50">
                    <h2 className="text-xl font-bold text-content flex items-center gap-2">
                        {isSignUp ? <UserPlus size={24} className="text-primary" /> : <LogIn size={24} className="text-primary" />}
                        {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    {notice && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm" role="status">
                            {notice}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted">{t('auth.email')}</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-content/50" size={18} />
                            <input
                                type="email"
                                name="email"
                                autoComplete="username"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full pl-10 pr-4 placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all text-[16px]"
                                style={{ paddingTop: '14px', paddingBottom: '14px' }}
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-muted">{t('auth.password')}</label>
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-xs font-medium text-primary underline underline-offset-2 rounded-sm hover:text-primary/80 transition-colors"
                                >
                                    {t('auth.forgotPassword')}
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input w-full pl-10 pr-11 placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all text-[16px]"
                                style={{ paddingTop: '14px', paddingBottom: '14px' }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-content transition-colors"
                                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isSignUp ? t('auth.signUp') : t('auth.signIn')}
                            </>
                        )}
                    </button>

                    {/* The prompt is plain text; only the action that switches mode is a
                        link, so it reads as the one clickable thing in the sentence. */}
                    <p className="text-center text-sm text-muted mt-4">
                        {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice(''); }}
                            className="font-medium text-primary underline underline-offset-2 rounded-sm hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                        >
                            {isSignUp ? t('auth.haveAccountAction') : t('auth.noAccountAction')}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
