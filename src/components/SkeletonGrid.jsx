/**
 * Placeholder cards for the first load. Firestore's persistent cache makes a
 * warm start instant, but a cold one on a phone network is seconds of blank
 * screen that is otherwise indistinguishable from an empty account.
 */
export function SkeletonGrid({ count = 6, columns = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' }) {
    return (
        <div className={`grid ${columns} gap-4`} aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                    <div className="skeleton w-full" style={{ aspectRatio: '4 / 3', borderRadius: 0 }} />
                    <div className="p-4">
                        <div className="skeleton h-4 w-3/4 mb-2" />
                        <div className="skeleton h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
