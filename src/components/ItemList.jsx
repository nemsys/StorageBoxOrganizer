import { ItemCard } from './ItemCard';

// Same grid as BoxList: an item card and a box card carry the same thing — a
// photo and a name — so they get the same column count at every width. One
// column on a phone showed 1.5 cards per screen, which is a long scroll for an
// inventory of a few hundred things.
export function ItemList({ items, onDeleteItem, onRemoveFromBox, onEditItem, onBoxClick, onImageClick, onTagClick }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
                <ItemCard
                    key={item.id}
                    item={item}
                    onDelete={onDeleteItem}
                    onRemoveFromBox={onRemoveFromBox}
                    onEdit={onEditItem}
                    boxName={item.boxName}
                    onBoxClick={onBoxClick}
                    onImageClick={onImageClick}
                    onTagClick={onTagClick}
                />
            ))}
        </div>
    );
}
