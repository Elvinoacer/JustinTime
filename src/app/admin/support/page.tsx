import { getSupportTickets } from '@/app/actions/admin';
import SupportTicketsTable from '@/components/admin/SupportTicketsTable';

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; priority?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || '';
  const priority = searchParams.priority || '';

  const { tickets, total, totalPages, currentPage } = await getSupportTickets(page, 10, status, priority);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
      </div>

      <SupportTicketsTable 
        tickets={tickets} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages} 
      />
    </div>
  );
}
