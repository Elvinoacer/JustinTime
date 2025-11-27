import { getSupportTickets } from '@/app/actions/admin';
import SupportClient from '@/components/admin/SupportClient';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
  priority?: string;
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  
  const filters = {
    status: params.status || 'ALL',
    priority: params.priority || 'ALL',
    search: params.search || '',
    category: params.category || 'ALL',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
  };

  const data = await getSupportTickets(page, 15, filters);

  return <SupportClient initialData={data} />;
}
