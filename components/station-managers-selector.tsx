"use client";

import * as React from "react";
import {
  Users,
  User,
  Mail,
  Phone,
  ShieldCheck,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface StationManagerUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string | null;
}

interface StationManagersSelectorProps {
  users: StationManagerUser[];
  value: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
  className?: string;
  compactCards?: boolean;
}

export function StationManagersSelector({
  users,
  value = [],
  onChange,
  disabled = false,
  label = "Station Managers",
  error,
  className,
  compactCards = false,
}: StationManagersSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedUsers = React.useMemo(() => {
    return value
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is StationManagerUser => Boolean(u));
  }, [value, users]);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  const handleSelectAll = () => {
    onChange(users.map((u) => u.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getInitials = (user: StationManagerUser) => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.email.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = (user: StationManagerUser) => {
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return fullName || user.email;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selector Trigger & Popover */}
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users size={14} className="text-primary" />
              {label}
            </label>
            {value.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0 font-medium">
                {value.length} selected
              </Badge>
            )}
          </div>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal bg-background text-foreground h-10 px-3",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                {value.length === 0 ? (
                  <span className="text-muted-foreground text-xs">
                    Assign station managers...
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-medium">
                      {value.length === 1
                        ? getUserDisplayName(selectedUsers[0])
                        : `${value.length} Managers Selected`}
                    </span>
                  </div>
                )}
              </div>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            sideOffset={4}
          >
            <Command shouldFilter={false}>
              <div className="p-2 border-b">
                <CommandInput
                  placeholder="Search by name or email..."
                  value={search}
                  onValueChange={setSearch}
                  className="h-8 text-xs"
                />
              </div>

              {/* Quick actions bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b text-[11px] text-muted-foreground">
                <span>{users.length} eligible managers</span>
                <div className="flex items-center gap-2">
                  {users.length > 0 && value.length < users.length && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-primary hover:underline font-medium"
                    >
                      Select all
                    </button>
                  )}
                  {value.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-destructive hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <CommandList className="max-h-[260px] overflow-y-auto p-1">
                {users.length === 0 ? (
                  <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                    No active staff found with station access.
                  </CommandEmpty>
                ) : null}

                <CommandGroup>
                  {users
                    .filter((u) => {
                      if (!search) return true;
                      const q = search.toLowerCase();
                      const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                      return name.includes(q) || u.email.toLowerCase().includes(q);
                    })
                    .map((user) => {
                      const isSelected = value.includes(user.id);
                      const displayName = getUserDisplayName(user);

                      return (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => toggleUser(user.id)}
                          className={cn(
                            "flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleUser(user.id)}
                            className="shrink-0"
                          />

                          <Avatar className="size-8 shrink-0 bg-primary/10 text-primary">
                            <AvatarFallback className="text-[11px] font-semibold">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>

                          {isSelected && (
                            <Check className="size-4 shrink-0 text-primary ml-auto" />
                          )}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </CommandList>

              <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {value.length} of {users.length} selected
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-7 text-xs px-3"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      {/* List of Assigned Managers */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Assigned Managers ({selectedUsers.length})
          </p>
          {selectedUsers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove all
            </button>
          )}
        </div>

        {selectedUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 p-4 text-center">
            <div className="size-9 mx-auto rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-2">
              <Users size={16} />
            </div>
            <p className="text-xs font-semibold text-foreground">
              No managers assigned
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
              Select one or more station managers above to grant them access to this station on the mobile app.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
            {selectedUsers.map((user) => {
              const displayName = getUserDisplayName(user);
              return (
                <div
                  key={user.id}
                  className={cn(
                    "group flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 hover:bg-stone-100/60 dark:hover:bg-stone-800/60 transition-colors shadow-2xs",
                    compactCards && "p-2.5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-9 shrink-0 bg-primary/10 text-primary border border-primary/20">
                      <AvatarFallback className="text-xs font-bold text-primary">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {displayName}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 shrink-0"
                        >
                          <ShieldCheck size={10} />
                          Manager
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={11} className="shrink-0 opacity-70" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        {user.phone && (
                          <span className="hidden sm:flex items-center gap-1 shrink-0">
                            <Phone size={11} className="shrink-0 opacity-70" />
                            <span>{user.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeUser(user.id)}
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title={`Unassign ${displayName}`}
                  >
                    <X size={14} />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
