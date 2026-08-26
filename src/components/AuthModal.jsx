import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { X, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted">{t('auth.email')}</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-content/50" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full pl-10 pr-4 placeholder:text-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all text-[16px]"
                                style={{ paddingTop: '14px', paddingBottom: '14px' }}
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted">{t('auth.password')}</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-content/50" size={18} />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input w-full pl-10 pr-4 placeholder:text-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all text-[16px]"
                                style={{ paddingTop: '14px', paddingBottom: '14px' }}
                                placeholder="••••••••"
                            />
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

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-muted hover:text-primary transition-colors"
                        >
                            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
