"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LucideIcon,
  User
} from "lucide-react";
import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  trigger: ReactElement;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onLogout?: () => void;
  profileHref?: string;
};

type MenuItem = {
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
};

const PROFILE_ITEMS: MenuItem[] = [
  { label: "My Profile", icon: User },
];

const LOGOUT_ITEM: MenuItem = {
  label: "Signout",
  icon: LogOut,
  destructive: true,
};

const itemClass = "px-4 py-2.5 text-sm cursor-pointer gap-3";

const ProfileDropdown = ({ trigger, defaultOpen, align = "end", user, onLogout, profileHref }: Props) => {
  const pathname = usePathname();
  const isStation = pathname === "/admin/station" || pathname?.startsWith("/admin/station/");
  const defaultProfileHref = isStation ? "/admin/station/profile" : "/admin/profile";
  const targetProfileHref = profileHref || defaultProfileHref;

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align={align}>
        <DropdownMenuGroup>
          {/* User Info */}
          <DropdownMenuLabel className="p-0 font-normal">
            <Link
              href={targetProfileHref}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-xs transition-colors cursor-pointer"
            >
              <div className="relative shrink-0">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-slate-700 text-white font-bold">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="ring-card absolute right-0 bottom-0 size-2 rounded-full bg-green-600 ring-2" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-foreground text-sm font-bold truncate">
                  {user?.name || "User"}
                </span>
                <span className="text-muted-foreground text-xs truncate">
                  {user?.email || "user@example.com"}
                </span>
              </div>
            </Link>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Main Links */}
          {PROFILE_ITEMS.map(({ label, icon: Icon }) => (
            <DropdownMenuItem key={label} className={itemClass} asChild>
              <Link href={targetProfileHref} className="flex items-center gap-3 w-full">
                <Icon size={20} className="text-foreground" />
                <span className="capitalize">{label}</span>
              </Link>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            variant="destructive"
            className={itemClass}
            onClick={onLogout}
          >
            <LOGOUT_ITEM.icon size={20} />
            <span className="capitalize">{LOGOUT_ITEM.label}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;

