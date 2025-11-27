import { getBookings } from '@/app/actions/admin';
import BookingsTable from '@/components/admin/BookingsTable';

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || '';

  const { bookings, total, totalPages, currentPage } = await getBookings(page, 10, status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        {/* Add filters here later */}
      </div>

      <BookingsTable 
        bookings={bookings} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages} 
      />
    </div>
  );
}
