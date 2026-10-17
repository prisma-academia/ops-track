"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building02Icon, Calculator01Icon } from "@hugeicons/core-free-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPageTabs({
  header,
  general,
  fleet,
  showFleetTab = false,
}: {
  header: ReactNode;
  general: ReactNode;
  fleet: ReactNode;
  showFleetTab?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab =
    showFleetTab && searchParams.get("tab") === "fleet" ? "fleet" : "general";

  const onTabChange = (value: string) => {
    if (value === "fleet" && !showFleetTab) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "general") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full gap-0">
      <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
        {header}
        <div className="flex justify-end border-t px-3 sm:px-6">
          <TabsList variant="line" className="h-11 w-auto justify-end gap-0 bg-transparent p-0">
            <TabsTrigger
              value="general"
              className="h-11 gap-2 rounded-none px-4 text-sm font-medium"
            >
              <HugeiconsIcon icon={Building02Icon} size={16} />
              General
            </TabsTrigger>
            {showFleetTab ? (
              <TabsTrigger
                value="fleet"
                className="h-11 gap-2 rounded-none px-4 text-sm font-medium"
              >
                <HugeiconsIcon icon={Calculator01Icon} size={16} />
                Fleet accounting
              </TabsTrigger>
            ) : null}
          </TabsList>
        </div>
      </section>
      <TabsContent value="general" className="mt-6 focus-visible:outline-none">
        {general}
      </TabsContent>
      {showFleetTab ? (
        <TabsContent value="fleet" className="mt-6 focus-visible:outline-none">
          {fleet}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
