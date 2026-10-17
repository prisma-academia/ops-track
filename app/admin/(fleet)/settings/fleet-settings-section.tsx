import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import { FleetSettingsForm } from "../fleet-settings/fleet-settings-form";

export function FleetSettingsSection({ initialFleet }: { initialFleet: FleetSettings }) {
  return (
    <div className="pb-10">
      <FleetSettingsForm initialFleet={initialFleet} />
    </div>
  );
}
