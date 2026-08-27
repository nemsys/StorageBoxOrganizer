import { Modal } from './Modal';
import { Package, Mail } from 'lucide-react';
import { APP_VERSION, BUILD_ID } from '../native/updates';
import { useTranslation } from '../translations';

const AUTHOR = 'SciScend';
const AUTHOR_URL = 'https://sciscend.com/';
const CONTACT_EMAIL = 'ivapopova@sciscend.com';

/**
 * Version and authorship, reachable from the settings menu.
 *
 * The version comes from package.json via vite's define (see vite.config.js),
 * so the release workflow's bump is the single source of truth. The build id
 * is the same one the update check compares against — useful when someone
 * reports a problem and you need to know exactly which deploy they are on.
 */
export function AboutModal({ isOpen, onClose }) {
    const { t } = useTranslation();

    const rows = [
        { label: t('about.version'), value: APP_VERSION },
        { label: t('about.build'), value: BUILD_ID },
        { label: t('about.author'), value: AUTHOR, href: AUTHOR_URL },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('about.title')}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <span className="text-primary shrink-0"><Package size={28} /></span>
                    <div>
                        <div className="text-content font-semibold">{t('app.title')}</div>
                        <div className="text-sm text-muted">{t('about.tagline')}</div>
                    </div>
                </div>

                <dl className="rounded-lg border border-border bg-surface/50 divide-y divide-border">
                    {rows.map(({ label, value, href }) => (
                        <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2">
                            <dt className="text-xs text-muted shrink-0">{label}</dt>
                            <dd className="text-sm font-medium break-all text-right">
                                {href ? (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline underline-offset-2 rounded-sm hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                                    >
                                        {value}
                                    </a>
                                ) : (
                                    <span className="text-content">{value}</span>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="space-y-1">
                    <div className="text-xs text-muted">{t('about.contact')}</div>
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
                    >
                        <Mail size={16} className="shrink-0" />
                        {CONTACT_EMAIL}
                    </a>
                </div>
            </div>
        </Modal>
    );
}
