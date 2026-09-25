export const PAGE_SIZE = 50;

type SP = Record<string, string | string[] | undefined>;

/** Read a single string search param. */
export function sp(params: SP, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

export function pageOf(params: SP) {
  const page = Math.max(1, Number(sp(params, "page")) || 1);
  return { page, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

/** Case-insensitive `contains` filter across several string fields. */
export function searchWhere(q: string | undefined, fields: string[]) {
  if (!q) return {};
  return { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) };
}
