import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";

const LANGUAGE_SWITCH_ENABLED =
  process.env.ENABLE_LANGUAGE_SWITCHING === "true";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  if (LANGUAGE_SWITCH_ENABLED && !locale) {
    locale = (await cookies()).get("NEXT_LOCALE")?.value;
  }

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
