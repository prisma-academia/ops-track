export function orgStationBankAccountWhere(params: {
  tenantId: string;
  organizationId?: string | null;
  stationId?: string | null;
  isActive?: boolean;
}) {
  return {
    tenantId: params.tenantId,
    scope: "STATION" as const,
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.organizationId ? { organizationId: params.organizationId } : {}),
    ...(params.stationId
      ? { stationAssignments: { some: { stationId: params.stationId, isActive: true } } }
      : {}),
  };
}
