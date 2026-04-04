import { redirect } from "next/navigation";

interface ProviderOnboardingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProviderOnboardingPage({
  searchParams,
}: ProviderOnboardingPageProps) {
  const params = (await searchParams) ?? {};
  const nextParams = new URLSearchParams();

  nextParams.set("intent", "provider");

  const ref = getSingleValue(params.ref)?.trim();
  const callbackUrl = getSingleValue(params.callbackUrl)?.trim();
  const returnTo = getSingleValue(params.returnTo)?.trim();

  if (ref) nextParams.set("ref", ref);
  if (callbackUrl) nextParams.set("callbackUrl", callbackUrl);
  if (returnTo) nextParams.set("returnTo", returnTo);

  redirect(`/onboarding?${nextParams.toString()}`);
}
