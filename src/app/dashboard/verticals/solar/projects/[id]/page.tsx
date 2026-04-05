import { redirect } from "next/navigation";

export default async function LegacySolarProjectRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/solar/projects/${id}`);
}
