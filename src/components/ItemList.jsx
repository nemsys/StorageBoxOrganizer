import { ItemCard } from './ItemCard';

export function ItemList({ items, onDeleteItem, onEditItem, onBoxClick, onImageClick, showItemNavigation = false }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
    );
}
