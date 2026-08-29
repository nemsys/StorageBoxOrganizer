import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { PackageOpen } from 'lucide-react';
import { useTranslation } from '../translations';

const AUTHOR = 'SciScend';
const AUTHOR_URL = 'https://sciscend.com/';

/**
 * Launch screen. On Android it takes over from the native splash (the same
 * icon on the same background, so the handover is invisible) and covers the
 * auth check and the first data read; in the browser it is the only splash
 * there is. Deliberately fixed-dark in both themes, to match splash.png.
 *
 * Unlike the PNG this one speaks the user's language: the name and the tagline
 * come from the translation layer, so they follow the language last chosen in
 * the settings menu.
 */
export const AppIntro = () => {
    const { t } = useTranslation();

    // Take down index.html's first-paint layer. It draws the same icon on the
    // same ground in the same place, so this swaps one for the other without a
    // visible change — and until React got here it was the only thing standing
    // between the platform's splash and a white page.
    useEffect(() => {
        document.getElementById('boot')?.remove();
    }, []);

    return (
        <motion.div
            className="app-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
        >
            {/* Dead centre, exactly where the native splash draws it. */}
            <div className="app-intro__logo">
                <PackageOpen strokeWidth={2} />
            </div>

            <motion.div
                className="app-intro__text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            >
                <h1 className="app-intro__title">{t('app.title')}</h1>
                <p className="app-intro__tagline">{t('about.tagline')}</p>
            </motion.div>

            <motion.div
                className="app-intro__by"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
            >
                {t('intro.by')}{' '}
                <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">{AUTHOR}</a>
            </motion.div>
        </motion.div>
    );
};
