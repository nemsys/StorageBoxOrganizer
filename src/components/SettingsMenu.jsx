import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Tags, Download, Upload, Sun, Moon, RefreshCw, ImageDown, LogOut } from 'lucide-react';

export const SettingsMenu = ({ onManageTags, onExport, onImport, onOptimizeImages, theme, onToggleTheme, onCheckUpdates, onSignOut }) => {
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
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
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
      label: 'Manage Tags',
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
      label: 'Export Data',
      icon: <Download size={18} />,
      onClick: () => {
        onExport();
        setIsOpen(false);
      }
    },
    {
      id: 'import',
      label: 'Import Data',
      icon: <Upload size={18} />,
      onClick: () => {
        onImport();
        setIsOpen(false);
      }
    },
    ...(onOptimizeImages ? [
      {
        id: 'optimize-images',
        label: 'Optimize Images',
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
        label: 'Check for Updates',
        icon: <RefreshCw size={18} />,
        onClick: () => {
          onCheckUpdates();
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
        label: 'Sign Out',
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
        title="Settings"
        aria-label="Settings Menu"
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
            className="absolute right-0 mt-3 w-64 py-2 bg-base border border-content/25 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {menuItems.map((item) => (
              item.isDivider ? (
                <div key={item.id} className="border-b border-content/15 my-1" />
              ) : (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted hover:text-content hover:bg-elevated transition-colors text-left group"
                >
                  <span className="text-content/50 group-hover:text-primary transition-colors">
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap font-medium">{item.label}</span>
                </button>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
