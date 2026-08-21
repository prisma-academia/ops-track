"use client";

import { useState, type ReactNode } from "react";
import { UserDetailActions } from "@/app/(platform)/(dashboard)/users/[id]/actions";
import { UserSecurityCard } from "./security-actions";

export function UserDetailsPanel({
  profile,
  userId,
  email,
  isOwner,
  status,
  bannedReason,
  permissions,
  allPermissions,
  roles,
}: {
  profile: ReactNode;
  userId: string;
  email: string;
  isOwner: boolean;
  status: "ACTIVE" | "SUSPENDED";
  bannedReason: string | null;
  permissions: string[];
  allPermissions: readonly string[];
  roles: { id: string; name: string; permissions: string[]; module: string }[];
}) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {profile}
        <UserSecurityCard
          userId={userId}
          email={email}
          isOwner={isOwner}
          status={status}
          bannedReason={bannedReason}
          resetPasswordEndpoint={`/api/tenant/users/${userId}/reset-password`}
          onEditPermissions={() => setIsEditMode(true)}
        />
      </div>
      <UserDetailActions
        userId={userId}
        scope="tenant"
        moduleContext="FLEET"
        permissions={permissions}
        allPermissions={allPermissions}
        roles={roles}
        applyRoleEndpoint={`/api/tenant/users/${userId}/apply-role`}
        permissionsEndpoint={`/api/tenant/users/${userId}/permissions`}
        resetPasswordEndpoint={`/api/tenant/users/${userId}/reset-password`}
        showSecurityActions={false}
        isEditMode={isEditMode}
        onEditModeChange={setIsEditMode}
        hideEditTrigger
      />
    </>
  );
}
