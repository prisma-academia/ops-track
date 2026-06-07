'use client'

import ProfileDropdown from "@/components/sections/dropdown-profile"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

interface HeaderV2Props {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSearchClick?: () => void;
  onLogout?: () => void;
}

export default function HeaderV2({
  user,
  onSearchClick,
  onLogout
}: HeaderV2Props) {
  const { theme, setTheme } = useTheme()
  return (
    <header className="bg-card/95 backdrop-blur sticky top-0 z-50 w-full">
      <div className="flex h-18 items-center justify-between border-b gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />

          <Separator orientation="vertical" className="h-4" />

          <div
            className="relative flex items-center max-w-md w-full cursor-pointer group"
            onClick={onSearchClick}
          >
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <Input
              placeholder="Search..."
              className="pl-9 h-10 w-[240px] lg:w-[320px] rounded-none! bg-muted/50 border-none pointer-events-none"
              readOnly
            />
            <div className="absolute right-3 px-1.5 py-0.5 rounded-none! border bg-background text-[10px] font-medium text-muted-foreground pointer-events-none">
              ⌘K
            </div>
          </div>
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
