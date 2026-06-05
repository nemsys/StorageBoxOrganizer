import { BoxCard } from './BoxCard';

export function BoxList({ boxes, allItems = [], onBoxClick, onImageClick }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {boxes.map(box => {
                const itemCount = allItems.filter(item => item.boxId === box.id).length;
                return (
                    <BoxCard
                        key={box.id}
                        box={box}
                        itemCount={itemCount}
                        onClick={onBoxClick}
                        onImageClick={onImageClick}
                    />
                );
            })}
        </div>
    );
}
