'use client'

import ProfileDropdown from "@/components/sections/dropdown-profile"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HeaderV2Props {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSearchClick?: () => void;
  onLogout?: () => void;
  stations?: { id: string; name: string; code: string }[];
  activeStationId?: string;
}

export default function HeaderV2({
  user,
  onLogout,
  stations = [],
  activeStationId = "all"
}: HeaderV2Props) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <header className="bg-card/95 backdrop-blur sticky top-0 z-50 w-full">
      <div className="flex h-18 items-center justify-between border-b gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />

          <Separator orientation="vertical" className="h-4" />

          {stations.length > 0 && (
            <div className="flex items-center">
              <Select
                value={activeStationId}
                onValueChange={(val) => {
                  document.cookie = `active-station-id=${val}; path=/; max-age=31536000; SameSite=Lax`;
                  router.refresh();
                }}
              >
                <SelectTrigger className="w-[180px] sm:w-[240px]">
                  <SelectValue placeholder="All Stations" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <ProfileDropdown
            user={user}
            onLogout={onLogout}
            trigger={
              <div
                id="profile-dropdown-trigger"
                className="rounded-full cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              >
                <Avatar className="size-10 rounded-full border bg-slate-700 text-white font-bold">
                  <AvatarFallback className="text-white bg-slate-700 font-bold">{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            }
          />
        </div>
      </div>
    </header>
  )
}
