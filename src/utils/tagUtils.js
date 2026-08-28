// Tags are case-insensitive throughout the app: "Books", "books" and " BOOKS "
// are one and the same tag. Lowercase is the canonical stored form, so every
// path that writes tags (item create/edit, tag rename, import) normalises here
// and nothing downstream has to compare case-insensitively.

/** Canonical form of a single tag. Returns '' for anything unusable. */
export function normalizeTag(tag) {
    return typeof tag === 'string' ? tag.trim().toLowerCase() : '';
}

/** Canonical, de-duplicated tag list, order preserved. */
export function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    const seen = new Set();
    const out = [];
    for (const tag of tags) {
        const norm = normalizeTag(tag);
        if (norm && !seen.has(norm)) {
            seen.add(norm);
            out.push(norm);
        }
    }
    return out;
}

/** Parse the comma-separated tag input used by the add/edit item modals. */
export function parseTagInput(input) {
    return normalizeTags(String(input || '').split(','));
}

/**
 * Every stored spelling of `tag` found across `items` (e.g. ['books', 'Books']).
 * Legacy and imported data can hold mixed case, and Firestore array queries are
 * case-sensitive, so rename/delete need the full variant list to match on.
 */
export function tagVariants(items, tag) {
    const target = normalizeTag(tag);
    const variants = new Set();
    (items || []).forEach(item => {
        (item.tags || []).forEach(stored => {
            if (normalizeTag(stored) === target) variants.add(stored);
        });
    });
    return Array.from(variants);
}

/** Case-insensitive "does this item carry this tag?". */
export function hasTag(item, tag) {
    const target = normalizeTag(tag);
    if (!target) return false;
    return (item?.tags || []).some(stored => normalizeTag(stored) === target);
}
