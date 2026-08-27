import { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { useTranslation } from '../translations';

/**
 * Shown when the account is signed in but Firestore refuses every read and
 * write — i.e. it has not been granted the `approved` custom claim.
 *
 * Anyone can create an account here (the Firebase web API key is public by
 * necessity), so approval is what actually controls access. The owner grants
 * it with `npm run access grant <email>`; until then this is the whole app.
 */
export function AccessPendingScreen({ user, onRecheck }) {
    const { t } = useTranslation();
    const [checking, setChecking] = useState(false);
    const [stillBlocked, setStillBlocked] = useState(false);

    const handleRecheck = async () => {
        setChecking(true);
        setStillBlocked(false);
        try {
            // Custom claims reach the client only on a token refresh, so force
            // one before asking the data layer to try again.
            await auth.currentUser?.getIdToken(true);
            const granted = await onRecheck();
            if (!granted) setStillBlocked(true);
        } catch (error) {
            console.error('Access re-check failed', error);
            setStillBlocked(true);
        } finally {
            setChecking(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="min-h-screen bg-base flex items-center justify-center p-4">
            <div className="bg-base border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-2 bg-surface/50">
                    <ShieldAlert size={24} className="text-primary shrink-0" />
                    <h2 className="text-xl font-bold text-content">{t('access.pending.title')}</h2>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-muted leading-relaxed">{t('access.pending.body')}</p>

                    <div className="space-y-1 rounded-lg border border-border bg-surface/50 p-3">
                        <div className="text-xs text-muted">{t('access.pending.accountLabel')}</div>
                        <div className="text-sm text-content font-medium break-all">{user?.email}</div>
                        <div className="text-xs text-muted pt-2">{t('access.pending.idLabel')}</div>
                        <div className="text-xs text-content font-mono break-all">{user?.uid}</div>
                    </div>

                    {stillBlocked && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                            {t('access.pending.stillBlocked')}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleRecheck}
                        disabled={checking}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {checking ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                {t('access.pending.recheck')}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted hover:text-primary transition-colors"
                    >
                        <LogOut size={18} />
                        {t('settings.signOut')}
                    </button>
                </div>
            </div>
        </div>
    );
}
