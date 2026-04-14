import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Tags, Download, Upload, Sun, Moon } from 'lucide-react';

export const SettingsMenu = ({ onManageTags, onExport, onImport, theme, onToggleTheme }) => {
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
      icon: theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />,
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
      icon: <Tags size={20} />,
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
      icon: <Download size={20} />,
      onClick: () => {
        onExport();
        setIsOpen(false);
      }
    },
    {
      id: 'import',
      label: 'Import Data',
      icon: <Upload size={20} />,
      onClick: () => {
        onImport();
        setIsOpen(false);
      }
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/5 text-slate-300 hover:text-white transition-all group"
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
            className="absolute right-0 mt-3 w-64 py-2 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {menuItems.map((item) => (
              item.isDivider ? (
                <div key={item.id} className="border-b border-white/5 my-1" />
              ) : (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left group"
                >
                  <span className="text-slate-500 group-hover:text-primary transition-colors">
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
