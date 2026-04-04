import { revalidatePath } from "next/cache";

export function revalidateAllSettingsPaths(): void {
  revalidatePath("/dashboard/settings");
  revalidatePath("/client/settings");
}
