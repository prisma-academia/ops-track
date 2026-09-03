import type { ReactNode } from "react";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.3c1.1-1.2 1.5-2.3 1.5-2.4-.1 0-2.8-1.1-2.8-4zM14.6 5.9c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.6-1.1z" />
    </svg>
  );
}

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#34A853" d="M3.2 20.6 13 10.8 16.4 14.2 4.8 21.4c-.5.3-1.1.3-1.6 0z" />
      <path fill="#4285F4" d="M20.5 10.6c.7.4.7 1.4 0 1.8l-3.6 2.1-3.6-3.5 3.6-3.5z" />
      <path fill="#FBBC04" d="M3.2 3.4C2.7 3.7 2.4 4.2 2.4 4.8v14.4c0 .6.3 1.1.8 1.4L13 10.8z" />
      <path fill="#EA4335" d="M13 10.8 3.2 3.4c.5-.3 1.1-.3 1.6 0L16.4 9.8z" />
    </svg>
  );
}

function StoreButton({
  href,
  icon,
  caption,
  title,
}: {
  href: string;
  icon: ReactNode;
  caption: string;
  title: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-3 rounded-full bg-foreground text-background px-5 py-3 transition-opacity hover:opacity-80"
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal uppercase tracking-wide opacity-80">{caption}</span>
        <span className="text-base font-medium">{title}</span>
      </span>
    </a>
  );
}

export function DownloadAppSection() {
  return (
    <section id="download" className="bg-background py-16 md:py-24">
      <div className="max-w-7xl mx-auto sm:px-16 px-4">
        <p className="text-xs font-normal text-muted-foreground">Download app</p>
        <h2 className="mt-2 mb-4 sm:text-4xl text-2xl font-medium text-foreground max-w-xl">
          Take OpsTrack with you in the field.
        </h2>
        <p className="mb-8 max-w-lg text-sm text-muted-foreground">
          Track trucks, stations, transport, and tanks from your phone. Available on the App Store and Google Play.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StoreButton
            href="#"
            icon={<AppleIcon className="size-7" />}
            caption="Download on the"
            title="App Store"
          />
          <StoreButton
            href="#"
            icon={<PlayStoreIcon className="size-7" />}
            caption="Get it on"
            title="Google Play"
          />
        </div>
      </div>
    </section>
  );
}
