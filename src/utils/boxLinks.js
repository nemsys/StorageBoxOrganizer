// The link a scanned label resolves to. It is the deep link the app already
// understands (`#box/<id>`), so a printed label and a shared URL are the same
// thing and neither needs its own routing.
export function boxUrl(boxId) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#box/${boxId}`;
}
