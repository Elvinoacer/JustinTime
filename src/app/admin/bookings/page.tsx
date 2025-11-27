import { getBookings } from '@/app/actions/admin';
import BookingsClient from '@/components/admin/BookingsClient';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export default async function AdminBookingsPage({
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
    minAmount: params.minAmount || '',
    maxAmount: params.maxAmount || '',
  };

  const data = await getBookings(page, 15, filters);

  return <BookingsClient initialData={data} />;
}
