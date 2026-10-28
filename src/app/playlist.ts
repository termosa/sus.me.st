/**
 * Puts tracks in the host's saved order. Tracks the order doesn't know yet (new uploads,
 * new built-ins) come last, in their default order.
 */
export function arrange<T extends { id: string }>(tracks: T[], order: string[]): T[] {
  const rank = (id: string) => {
    const at = order.indexOf(id);
    return at < 0 ? order.length : at;
  };
  return [...tracks].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * The full order after moving a track to position `to` among the visible ones. It lands
 * right before the visible track that follows it, so hidden tracks keep their places.
 */
export function moveTrack(all: string[], visible: string[], id: string, to: number): string[] {
  const rest = all.filter((t) => t !== id);
  const others = visible.filter((t) => t !== id);
  const next = others[to];
  const last = others[others.length - 1];
  let at = 0;
  if (next !== undefined) at = rest.indexOf(next);
  else if (last !== undefined) at = rest.indexOf(last) + 1;
  rest.splice(at, 0, id);
  return rest;
}
