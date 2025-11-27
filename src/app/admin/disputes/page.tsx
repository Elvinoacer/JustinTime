import { getDisputes } from '@/app/actions/admin';
import DisputesClient from '@/components/admin/DisputesClient';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  creatorRole?: string;
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  
  const filters = {
    status: params.status || 'ALL',
    search: params.search || '',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
    creatorRole: params.creatorRole || 'ALL',
  };

  const data = await getDisputes(page, 15, filters);

  return <DisputesClient initialData={data} />;
}
