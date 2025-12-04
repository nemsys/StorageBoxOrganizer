import { ItemCard } from './ItemCard';
import { Plus } from 'lucide-react';

export function ItemList({ items, onAddClick, onDeleteItem, onEditItem, onBoxClick, onImageClick, showItemNavigation = false }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {onAddClick && (
                <div
                    onClick={onAddClick}
                    className="card border-dashed border-2 border-slate-700 bg-transparent flex items-center justify-center min-h-[160px] cursor-pointer hover:border-primary hover:bg-slate-800/50 group"
                    title="Add New Item"
                >
                    <div className="p-3 rounded-lg bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                        <Plus size={32} />
                    </div>
                </div>
            )}

            {items.map(item => (
                <ItemCard
                    key={item.id}
                    item={item}
                    onDelete={onDeleteItem}
                    onEdit={onEditItem}
                    boxName={item.boxName}
                    onBoxClick={onBoxClick}
                    onImageClick={onImageClick}
                    showNavigation={showItemNavigation}
                />
            ))}

            {onAddClick && items.length > 0 && (
                <div
                    onClick={onAddClick}
                    className="card border-dashed border-2 border-slate-700 bg-transparent flex items-center justify-center min-h-[160px] cursor-pointer hover:border-primary hover:bg-slate-800/50 group"
                    title="Add New Item"
                >
                    <div className="p-3 rounded-lg bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                        <Plus size={32} />
                    </div>
                </div>
            )}
        </div>
    );
}
