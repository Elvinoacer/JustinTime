import { getDisputes } from '@/app/actions/admin';
import DisputesTable from '@/components/admin/DisputesTable';

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || '';

  const { disputes, total, totalPages, currentPage } = await getDisputes(page, 10, status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Disputes</h1>
      </div>

      <DisputesTable 
        disputes={disputes} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages} 
      />
    </div>
  );
}
