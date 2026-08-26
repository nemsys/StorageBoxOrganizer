import { Search } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = '' }) {
    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Search size={18} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="input pl-10 bg-surface/50 border-border focus:bg-surface"
                placeholder={placeholder}
            />
        </div>
    );
}
