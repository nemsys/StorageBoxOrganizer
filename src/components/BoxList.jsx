import { BoxCard } from './BoxCard';

// `itemCounts` is a Map built once in App, not a list to filter per card: the
// old shape walked the whole inventory again for every box on screen.
export function BoxList({ boxes, itemCounts, onBoxClick, onImageClick }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boxes.map(box => {
                return (
                    <BoxCard
                        key={box.id}
                        box={box}
                        itemCount={itemCounts?.get(box.id) || 0}
                        onClick={onBoxClick}
                        onImageClick={onImageClick}
                    />
                );
            })}
        </div>
    );
}
