export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">--</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium">Pending Verifications</h3>
          <p className="text-3xl font-bold text-amber-600 mt-2">--</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium">Active Disputes</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">--</p>
        </div>
      </div>
    </div>
  );
}
