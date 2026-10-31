import { cn } from "@/lib/utils";
import type { WorkspaceNotice } from "@/lib/tenant/workspace-state";
import { TrialCountdown } from "@/components/tenant/trial-countdown";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Alert02Icon, AlertCircleIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";

const TONE = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

const TONE_ICON: Record<WorkspaceNotice["tone"], IconSvgElement> = {
  info: InformationCircleIcon,
  warning: Alert02Icon,
  danger: AlertCircleIcon,
};

export function WorkspaceNoticeBanner({ notice }: { notice: WorkspaceNotice }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-2.5", TONE[notice.tone])}>
      <HugeiconsIcon icon={TONE_ICON[notice.tone]} size={18} className="shrink-0" />
      <p className="min-w-0 flex-1 truncate text-sm leading-5">
        <span className="font-bold">{notice.title}</span>
        <span className="font-normal opacity-80"> {notice.body}</span>
      </p>
      {notice.endsAt ? <TrialCountdown endsAt={notice.endsAt} /> : null}
    </div>
  );
}

export function WorkspaceNoticeList({ notices }: { notices: WorkspaceNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {notices.map((notice) => (
        <WorkspaceNoticeBanner key={notice.title} notice={notice} />
      ))}
    </div>
  );
}

export function WorkspaceBlocked({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </main>
  );
}
