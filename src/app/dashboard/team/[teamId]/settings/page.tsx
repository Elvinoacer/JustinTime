import { redirect } from "next/navigation";

interface TeamScopedSettingsPageProps {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function flattenSearchParams(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const query = new URLSearchParams();
  if (!searchParams) {
    return query;
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        query.set(key, value[0]);
      }
      continue;
    }

    query.set(key, value);
  }

  return query;
}

export default async function TeamScopedSettingsPage({
  params,
  searchParams,
}: TeamScopedSettingsPageProps) {
  const { teamId } = await params;
  const search = searchParams ? await searchParams : undefined;
  const query = flattenSearchParams(search);
  query.set("teamId", teamId);
  redirect(`/dashboard/team/settings?${query.toString()}`);
}
