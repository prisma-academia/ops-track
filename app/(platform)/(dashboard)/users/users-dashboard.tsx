"use client";

import { DataTableToolbar } from "@/components/data-table-toolbar";
import { UsersTable, type PlatformUserRow } from "./table";

interface PlatformUsersDashboardProps {
  initialUsers: PlatformUserRow[];
  canInvite: boolean;
}

export function PlatformUsersDashboard({
  initialUsers,
  canInvite,
}: PlatformUsersDashboardProps) {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Platform users"
        description="Manage and track platform users"
        createHref={canInvite ? "/users/new" : undefined}
        createLabel="Invite user"
      />

      <UsersTable data={initialUsers} />
    </div>
  );
}
