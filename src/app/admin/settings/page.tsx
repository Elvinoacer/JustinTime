import { getCategories, getSystemSettings } from '@/app/actions/admin';
import SettingsClient from '@/components/admin/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [categories, systemSettings] = await Promise.all([
    getCategories(),
    getSystemSettings()
  ]);

  return <SettingsClient categories={categories} systemSettings={systemSettings} />;
}
