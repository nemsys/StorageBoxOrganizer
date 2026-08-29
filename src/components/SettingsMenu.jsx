import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Tags, Download, Upload, Sun, Moon, RefreshCw, ImageDown, LogOut, Languages, Info } from 'lucide-react';
import { useTranslation, LANGUAGES } from '../translations';

export const SettingsMenu = ({ userEmail, onManageTags, onExport, onImport, onOptimizeImages, theme, onToggleTheme, onCheckUpdates, onAbout, onSignOut }) => {
  const { t, lang, setLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      id: 'theme',
      label: theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode'),
      icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
      onClick: () => {
        onToggleTheme();
        setIsOpen(false);
      }
    },
    {
      id: 'divider-1',
      isDivider: true
    },
    {
      id: 'tags',
      label: t('settings.manageTags'),
      icon: <Tags size={18} />,
      onClick: () => {
        onManageTags();
        setIsOpen(false);
      }
    },
    {
      id: 'divider-2',
      isDivider: true
    },
    {
      id: 'export',
      label: t('settings.export'),
      icon: <Download size={18} />,
      onClick: () => {
        onExport();
        setIsOpen(false);
      }
    },
    {
      id: 'import',
      label: t('settings.import'),
      icon: <Upload size={18} />,
      onClick: () => {
        onImport();
        setIsOpen(false);
      }
    },
    ...(onOptimizeImages ? [
      {
        id: 'optimize-images',
        label: t('settings.optimizeImages'),
        icon: <ImageDown size={18} />,
        onClick: () => {
          onOptimizeImages();
          setIsOpen(false);
        }
      }
    ] : []),
    ...(onCheckUpdates ? [
      {
        id: 'divider-3',
        isDivider: true
      },
      {
        id: 'check-updates',
        label: t('settings.checkUpdates'),
        icon: <RefreshCw size={18} />,
        onClick: () => {
          onCheckUpdates();
          setIsOpen(false);
        }
      }
    ] : []),
    ...(onAbout ? [
      {
        id: 'about',
        label: t('settings.about'),
        icon: <Info size={18} />,
        onClick: () => {
          onAbout();
          setIsOpen(false);
        }
      }
    ] : []),
    ...(onSignOut ? [
      {
        id: 'divider-signout',
        isDivider: true
      },
      {
        id: 'sign-out',
        label: t('settings.signOut'),
        icon: <LogOut size={18} />,
        onClick: () => {
          onSignOut();
          setIsOpen(false);
        }
      }
    ] : [])
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-elevated hover:bg-elevated border border-content/15 text-muted hover:text-content transition-all group"
        title={t('settings.title')}
        aria-label={t('settings.menu')}
      >
        <Settings size={20} className={`transition-transform duration-500 ${isOpen ? 'text-primary rotate-45' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-72 max-w-[calc(100vw-1.5rem)] py-2 bg-base border border-content/25 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Signed-in identity lives here instead of a dedicated header bar,
                which cost a full row of vertical space on every screen. */}
            {userEmail && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs text-muted">{t('nav.signedInAs')}</p>
                  <p className="text-sm font-medium text-content break-all">{userEmail}</p>
                </div>
                <div className="border-b border-content/15 my-1" />
              </>
            )}
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-content/50">
                <Languages size={18} />
              </span>
              <span className="text-sm font-medium text-muted flex-1">{t('lang.name')}</span>
              <div className="flex bg-elevated rounded-lg p-0.5 border border-content/15">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => setLang(option.code)}
                    aria-pressed={lang === option.code}
                    title={option.name}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      lang === option.code
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted hover:text-content'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b border-content/15 my-1" />

            {menuItems.map((item) => (
              item.isDivider ? (
                <div key={item.id} className="border-b border-content/15 my-1" />
              ) : (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted hover:text-content hover:bg-elevated transition-colors text-left group"
                >
                  <span className="shrink-0 text-content/50 group-hover:text-primary transition-colors">
                    {item.icon}
                  </span>
                  <span className="font-medium leading-snug">{item.label}</span>
                </button>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
