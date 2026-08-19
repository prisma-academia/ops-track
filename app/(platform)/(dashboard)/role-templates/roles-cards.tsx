"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Shield, Eye, Pencil } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type RoleCardRow = {
  id: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  readCount: number;
  writeCount: number;
  approveCount: number;
};

function PermissionStat({
  label,
  count,
  dotClass,
}: {
  label: string;
  count: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`size-2.5 shrink-0 rounded-full ${dotClass}`} />
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
    </div>
  );
}

export function RolesCards({
  data,
  detailBasePath,
  canEdit,
}: {
  data: RoleCardRow[];
  /** Base path for role detail pages, e.g. `/admin/role-templates` */
  detailBasePath: string;
  canEdit: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="max-w-sm h-9"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {data.length === 0 ? "No role templates yet." : "No roles match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((role) => {
            const href = `${detailBasePath}/${role.id}`;
            const editHref = `${href}?edit=1`;

            return (
              <Card key={role.id} className="border-border/40 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate">{role.name}</CardTitle>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3.5 shrink-0" />
                        <span>
                          <span className="font-medium text-foreground">{role.userCount}</span> users
                        </span>
                      </div>
                    </div>
                    {role.isSystem ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">System</Badge>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Shield className="size-3.5" />
                    Permissions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <PermissionStat label="Read" count={role.readCount} dotClass="bg-blue-500" />
                    <PermissionStat label="Write" count={role.writeCount} dotClass="bg-amber-500" />
                    <PermissionStat label="Approve" count={role.approveCount} dotClass="bg-emerald-500" />
                  </div>
                </CardContent>

                <CardFooter className="gap-2 border-t border-border/40 pt-4">
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href={href}>
                      <Eye className="mr-1.5 size-3.5" />
                      View details
                    </Link>
                  </Button>
                  {canEdit ? (
                    <Button size="sm" className="h-8 text-xs" asChild>
                      <Link href={editHref}>
                        <Pencil className="mr-1.5 size-3.5" />
                        Edit
                      </Link>
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
