import { getUsers } from '@/app/actions/admin';
import UsersTable from '@/components/admin/UsersTable';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; role?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const role = searchParams.role || '';

  const { users, total, totalPages, currentPage } = await getUsers(page, 10, search, role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <div className="flex gap-2">
          {/* Add filters here later */}
        </div>
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
