"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export interface UnauthorizedUserDetails {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  otherName: string | null;
  phone: string | null;
  isOwner: boolean;
  status: string;
  activeModules: string[];
  stationPermissions: string[];
  fleetPermissions: string[];
  createdAt: string | Date;
  lastLoginAt?: string | Date | null;
  tenant?: any;
  organization?: any;
  stations?: any[];
  ownerContact?: any;
  matchedRoleName?: string | null;
}

export interface UnauthorizedAccessViewProps {
  user: UnauthorizedUserDetails;
  moduleKey?: string | null;
  permissionKey?: string | null;
  reason?: string | null;
  fromPath?: string | null;
  defaultHomeHref?: string;
  defaultHomeLabel?: string;
}

/**
 * @deprecated Deprecated in favor of direct user profile page navigation (/admin/station/profile or /admin/profile).
 */
export function UnauthorizedAccessView({ moduleKey }: UnauthorizedAccessViewProps) {
  const router = useRouter();

  useEffect(() => {
    const target = moduleKey === "FLEET" ? "/admin/profile?error=unauthorized" : "/admin/station/profile?error=unauthorized";
    router.replace(target);
  }, [moduleKey, router]);

  return null;
}
