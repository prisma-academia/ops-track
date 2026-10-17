export function normalizeDepotName(name: string): string {
  return name.trim().toUpperCase();
}

export function formatDepotRow<
  T extends {
    latitude: { toNumber(): number } | null;
    longitude: { toNumber(): number } | null;
    createdAt: Date;
  },
>(depot: T) {
  const { latitude, longitude, createdAt, ...rest } = depot;
  return {
    ...rest,
    latitude: latitude != null ? latitude.toNumber() : null,
    longitude: longitude != null ? longitude.toNumber() : null,
    createdAt: createdAt.toISOString(),
  };
}
