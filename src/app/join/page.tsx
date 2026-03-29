import { redirect } from "next/navigation";

interface JoinPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = (await searchParams) ?? {};
  const rawRef = params.ref;
  const referralCode = Array.isArray(rawRef) ? rawRef[0] : rawRef;

  if (referralCode) {
    redirect(`/auth/signup?ref=${encodeURIComponent(referralCode)}`);
  }

  redirect("/auth/signup");
}
