export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(searchParams: URLSearchParams): { cursor: string | null; take: number } {
  const cursor = searchParams.get("cursor");
  const rawTake = parseInt(searchParams.get("take") ?? `${DEFAULT_PAGE_SIZE}`, 10);
  const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(rawTake, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return { cursor, take };
}

export function buildPageMeta<T extends { id: string }>(rows: T[], take: number): { nextCursor: string | null } {
  if (rows.length < take) return { nextCursor: null };
  return { nextCursor: rows[rows.length - 1]?.id ?? null };
}

export function parseOffsetPagination(searchParams: URLSearchParams): { page: number; take: number; skip: number } {
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawTake = parseInt(searchParams.get("take") ?? `${DEFAULT_PAGE_SIZE}`, 10);
  const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(rawTake, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * take;
  return { page, take, skip };
}

export function buildOffsetPageMeta(totalCount: number, page: number, take: number) {
  const totalPages = Math.ceil(totalCount / take);
  return {
    page,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
