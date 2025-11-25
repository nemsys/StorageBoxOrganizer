import { Search } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = "Search..." }) {
    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="input pl-10 bg-slate-800/50 border-slate-700 focus:bg-slate-800"
                placeholder={placeholder}
            />
        </div>
    );
}
