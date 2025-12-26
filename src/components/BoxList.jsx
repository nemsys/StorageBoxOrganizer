import { BoxCard } from './BoxCard';
import { Plus, Package } from 'lucide-react';

export function BoxList({ boxes, allItems = [], onBoxClick, onAddClick, onDeleteBox, onEditBox, onRemoveBox, onAddItemClick }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div
                onClick={onAddClick}
                className="card border-dashed border-2 border-slate-700 bg-transparent flex flex-col items-center justify-center min-h-[200px] h-full cursor-pointer hover:border-primary hover:bg-slate-800/50 group"
            >
                <div className="p-4 rounded-lg bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-2">
                    <Plus size={32} />
                </div>
                <span className="font-medium text-slate-400 group-hover:text-primary">Add New Box</span>
            </div>

            {onAddItemClick && (
                <div
                    onClick={onAddItemClick}
                    className="card border-dashed border-2 border-slate-700 bg-transparent flex flex-col items-center justify-center min-h-[200px] h-full cursor-pointer hover:border-primary hover:bg-slate-800/50 group"
                >
                    <div className="p-4 rounded-lg bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-2">
                        <Package size={32} />
                    </div>
                    <span className="font-medium text-slate-400 group-hover:text-primary">Add New Item</span>
                </div>
            )}

            {boxes.map(box => {
                const itemCount = allItems.filter(item => item.boxId === box.id).length;
                return (
                    <BoxCard
                        key={box.id}
                        box={box}
                        itemCount={itemCount}
                        onClick={onBoxClick}
                    />
                );
            })}
        </div>
    );
}
