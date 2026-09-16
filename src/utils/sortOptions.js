// The orders a list can be put in. Their own module because both SortFilterBar
// and App need them, and a component file that also exports constants breaks
// fast refresh.

/** Items, and the shared base for boxes. */
export const SORT_OPTIONS = [
  { value: 'newest', tKey: 'sort.newest' },
  { value: 'oldest', tKey: 'sort.oldest' },
  { value: 'name-asc', tKey: 'sort.nameAsc' },
  { value: 'name-desc', tKey: 'sort.nameDesc' },
];

/**
 * Boxes can also be ordered by things an item has no equivalent of.
 *
 * `updated` is first among them because it is the most useful of the lot and
 * the data was already there: a box is stamped whenever its contents change, so
 * this is "the box I was just working in", which `newest` (creation order)
 * answers only for boxes nobody has touched since packing.
 */
export const BOX_SORT_OPTIONS = [
  ...SORT_OPTIONS,
  { value: 'updated', tKey: 'sort.updated' },
  { value: 'location', tKey: 'sort.location' },
  { value: 'fullest', tKey: 'sort.fullest' },
];
