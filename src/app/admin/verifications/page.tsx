import { getUsers } from '@/app/actions/admin';
import UsersTable from '@/components/admin/UsersTable';

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  
  // Fetch only users with PENDING verification status
  // We'll need to update getUsers to support this or filter client-side if API doesn't support it yet.
  // For now, let's assume we can pass a filter or we might need to add a new action.
  // Actually, getUsers has a 'role' param but not verification status.
  // Let's update getUsers in admin.ts first to support filtering by verification status.
  
  // But wait, I can't update admin.ts in this same tool call easily if I want to use the updated version here.
  // I will write this file assuming I will update admin.ts next.
  
  // Let's use a dedicated action for verifications or update getUsers.
  // I'll update getUsers to accept a `verificationStatus` parameter.
  
  const { users, total, totalPages, currentPage } = await getUsers(page, 10, search, 'PROVIDER', 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pending Verifications</h1>
      </div>

      <UsersTable 
        users={users} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages} 
      />
    </div>
  );
}
