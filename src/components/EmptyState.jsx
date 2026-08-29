/**
 * The screen a view shows when it has nothing to list.
 *
 * Two distinct cases, deliberately not merged: "you have not created anything
 * yet" (offer the way to create one) and "your search/filter matched nothing"
 * (offer the way to clear it). Showing the first when the user has 40 boxes and
 * a typo in the search field is how an app reads as broken.
 */
export function EmptyState({ icon, title, hint, actionLabel, onAction, actionIcon }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="p-4 rounded-full bg-surface/60 mb-4 text-muted">
                {icon}
            </div>
            <p className="text-muted text-lg font-medium">{title}</p>
            {hint && <p className="text-muted text-sm mt-1 mb-5 max-w-sm">{hint}</p>}
            {actionLabel && onAction && (
                <button onClick={onAction} className="btn btn-primary">
                    {actionIcon}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
