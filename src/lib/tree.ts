type Node = { id: string; parentId: string | null; name: string };

/** Depth-first flatten of a parent/child list, siblings sorted by name. Orphans become roots. */
export function flattenTree<T extends Node>(items: T[]): (T & { depth: number })[] {
  const ids = new Set(items.map((i) => i.id));
  const byParent = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const out: (T & { depth: number })[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const item of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      if (seen.has(item.id)) continue; // guard against cycles
      seen.add(item.id);
      out.push({ ...item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Ids of `id` and all its descendants (used to forbid choosing a descendant as new parent). */
export function descendantsOf(items: Node[], id: string): Set<string> {
  const result = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of items) {
      if (i.parentId && result.has(i.parentId) && !result.has(i.id)) {
        result.add(i.id);
        grew = true;
      }
    }
  }
  return result;
}
