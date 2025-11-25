import { ItemCard } from './ItemCard';
import { Plus } from 'lucide-react';

export function ItemList({ items, onAddClick, onDeleteItem, onBoxClick }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
                onClick={onAddClick}
                className="card border-dashed border-2 border-slate-700 bg-transparent flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-primary hover:bg-slate-800/50 group"
            >
                <div className="p-4 rounded-full bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-2">
                    <Plus size={32} />
                </div>
                <span className="font-medium text-slate-400 group-hover:text-primary">Add New Item</span>
            </div>

            {items.map(item => (
                <ItemCard key={item.id} item={item} onDelete={onDeleteItem} boxName={item.boxName} onBoxClick={onBoxClick} />
            ))}
        </div>
    );
}
