import { getTranslations } from "next-intl/server";

export default async function MaintenancePage() {
  const t = await getTranslations("maintenance");
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-stone-600">{t("body")}</p>
      </div>
    </main>
  );
}
