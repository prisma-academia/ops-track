import { StoreButtons } from "@/components/landing-page/store-buttons";

export function DownloadAppSection() {
  return (
    <section id="download" className="bg-background py-16 md:py-24">
      <div className="max-w-7xl mx-auto sm:px-16 px-4">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-normal text-muted-foreground">Download app</p>
            <h2 className="mt-2 mb-4 sm:text-4xl text-2xl font-medium text-foreground max-w-xl">
              Take OpsTrack with you in the field.
            </h2>
            <p className="mb-8 max-w-lg text-sm text-muted-foreground">
              Track trucks, stations, transport, and tanks from your phone. Available on the App Store and Google Play.
            </p>
            <StoreButtons href="/auth/login" />
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/assets/images/opstrack-mobile-app-2.png"
              alt="OpsTrack mobile app login screen"
              width={698}
              height={1024}
              className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] h-auto object-contain "
            />
          </div>
        </div>
      </div>
    </section>
  );
}
