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

/** Boxes can also be ordered by things an item has no equivalent of. */
export const BOX_SORT_OPTIONS = [
  ...SORT_OPTIONS,
  { value: 'location', tKey: 'sort.location' },
];
