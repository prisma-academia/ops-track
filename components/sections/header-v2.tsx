'use client'

import { useEffect, useState } from "react"
import ProfileDropdown from "@/components/sections/dropdown-profile"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Moon, Sun, Bell, Info, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { apiGet, apiPost } from "@/lib/client/api"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type InboxItem = {
  id: string
  readAt: string | null
  createdAt: string
  message: {
    title: string
    body: string
    module: "STATION" | "FLEET"
  }
}

function timeAgo(value: string) {
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(delta / 60000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

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
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [items, setItems] = useState<InboxItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const isDark = theme === "dark" || resolvedTheme === "dark"

  async function loadInbox() {
    const res = await apiGet<{ items: InboxItem[]; unreadCount: number }>("/api/tenant/notifications/inbox")
    if (res.data) {
      setItems(res.data.items ?? [])
      setUnreadCount(res.data.unreadCount ?? 0)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  async function markAllRead() {
    await apiPost("/api/tenant/notifications/inbox/read", { all: true })
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
  }

  return (
    <header className="bg-card/95 backdrop-blur sticky top-0 z-50 w-full">
      <div className="flex h-18 items-center justify-between border-b gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="cursor-pointer"/>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative text-foreground hover:bg-muted"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border/40 shadow-xl" showCloseButton={true}>
              <SheetHeader className="p-6 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    Notifications
                  </SheetTitle>
                  <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                </div>
                <SheetDescription className="text-xs mt-1 text-muted-foreground">
                  Stay updated with station operations and logistics.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                {items.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>
                ) : items.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <div
                      key={n.id}
                      className={`p-5 flex gap-4 transition-colors hover:bg-muted/10 relative ${
                        unread ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                    >
                      {unread && (
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      <div className="p-2.5 rounded-lg border border-border/40 bg-card text-muted-foreground flex items-center justify-center shrink-0 h-10 w-10">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-tight">{n.message.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal">{n.message.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border/40 bg-muted/10">
                <Button className="w-full text-xs font-semibold h-9 rounded-md" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-foreground hover:bg-muted"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Profile Dropdown */}
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
