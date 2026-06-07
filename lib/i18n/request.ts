import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";

/**
 * next-intl request config. No `[locale]` URL segment — the locale is resolved
 * server-side per request (tenant settings → Accept-Language → default).
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/en.json`)).default;
  }
  return { locale, messages };
});
