import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Tags, Download, Upload, ChevronDown } from 'lucide-react';

export const SettingsMenu = ({ onManageTags, onExport, onImport }) => {
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
      label: 'Manage Tags',
      icon: <Tags size={16} />,
      onClick: () => {
        onManageTags();
        setIsOpen(false);
      }
    },
    {
      label: 'Export Data',
      icon: <Download size={16} />,
      onClick: () => {
        onExport();
        setIsOpen(false);
      }
    },
    {
      label: 'Import Data',
      icon: <Upload size={16} />,
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
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/5 text-slate-300 hover:text-white transition-all group"
        title="Settings & Tools"
      >
        <Settings size={14} className={`transition-transform duration-500 ${isOpen ? 'text-primary' : ''}`} />
        <span className="text-xs font-medium">Settings</span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-48 py-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage Tools</span>
            </div>
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left group"
              >
                <span className="text-slate-500 group-hover:text-primary transition-colors">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
