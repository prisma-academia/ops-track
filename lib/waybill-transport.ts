export function cleanTransportStr(val?: string | null, placeholder?: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed === "-" ||
    (placeholder && trimmed.toLowerCase() === placeholder.toLowerCase())
  ) {
    return null;
  }
  return trimmed;
}

export interface TransportWithRelations {
  isOneTime?: boolean | null;
  oneTimeTransporterName?: string | null;
  oneTimeTruckPlate?: string | null;
  oneTimeDriverName?: string | null;
  truck?: { plateNumber?: string | null; name?: string | null } | null;
  driver?: { firstName?: string | null; lastName?: string | null } | null;
  transporter?: { name?: string | null } | null;
}

export interface WaybillEntity {
  truckPlate?: string | null;
  driverName?: string | null;
  transportCompany?: string | null;
}

export function resolveWaybillTransportInfo(
  transport?: TransportWithRelations | null,
  waybill?: WaybillEntity | null
) {
  const isOneTime = Boolean(
    transport?.isOneTime ||
    transport?.oneTimeTruckPlate ||
    transport?.oneTimeDriverName ||
    transport?.oneTimeTransporterName
  );

  const cleanPlate = (v?: string | null) => cleanTransportStr(v, "N/A");
  const cleanDriver = (v?: string | null) => cleanTransportStr(v, "Unknown Driver");
  const cleanCo = (v?: string | null) => cleanTransportStr(v, "N/A");

  const driverFullName = transport?.driver
    ? `${transport.driver.firstName || ""} ${transport.driver.lastName || ""}`.trim()
    : null;

  const truckPlate = isOneTime
    ? (cleanPlate(transport?.oneTimeTruckPlate) ||
       cleanPlate(waybill?.truckPlate) ||
       cleanPlate(transport?.truck?.plateNumber) ||
       cleanPlate(transport?.truck?.name) ||
       "—")
    : (cleanPlate(waybill?.truckPlate) ||
       cleanPlate(transport?.truck?.plateNumber) ||
       cleanPlate(transport?.truck?.name) ||
       cleanPlate(transport?.oneTimeTruckPlate) ||
       "—");

  const driverName = isOneTime
    ? (cleanDriver(transport?.oneTimeDriverName) ||
       cleanDriver(waybill?.driverName) ||
       cleanDriver(driverFullName) ||
       "—")
    : (cleanDriver(waybill?.driverName) ||
       cleanDriver(driverFullName) ||
       cleanDriver(transport?.oneTimeDriverName) ||
       "—");

  const transportCompany = isOneTime
    ? (cleanCo(transport?.oneTimeTransporterName) ||
       cleanCo(waybill?.transportCompany) ||
       cleanCo(transport?.transporter?.name) ||
       null)
    : (cleanCo(transport?.transporter?.name) ||
       cleanCo(waybill?.transportCompany) ||
       cleanCo(transport?.oneTimeTransporterName) ||
       null);

  return {
    isOneTime,
    truckPlate,
    driverName,
    transportCompany,
    oneTimeTransporterName: transport?.oneTimeTransporterName ?? null,
    oneTimeTruckPlate: transport?.oneTimeTruckPlate ?? null,
    oneTimeDriverName: transport?.oneTimeDriverName ?? null,
  };
}
