import { redirect } from "next/navigation";

type VerifyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = (await searchParams) ?? {};
  const token = getSingleValue(params.token).trim();

  if (token) {
    redirect(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  redirect("/auth/verify-request");
}
