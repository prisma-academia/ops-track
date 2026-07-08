export interface PageMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  meta: PageMeta;
}
