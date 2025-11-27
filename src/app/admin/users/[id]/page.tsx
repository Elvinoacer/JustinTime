import { getUserDetails } from '@/app/actions/admin';
import Link from 'next/link';
import UserAdminActions from '@/components/admin/UserAdminActions';

import ProviderVerificationCard from '@/components/admin/ProviderVerificationCard';

export const dynamic = 'force-dynamic';

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserDetails(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header with Glassmorphism */}
        <div className="relative z-50 flex items-center justify-between backdrop-blur-sm bg-white/70 p-6 rounded-2xl border border-white shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/users"
              className="group p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform duration-200">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                User Details
              </h1>
              <p className="text-slate-500 text-sm mt-1">Comprehensive user information and management</p>
            </div>
          </div>
          <UserAdminActions user={user} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Verification Card for Providers */}
            {user.role === 'PROVIDER' && user.profile && (
              <ProviderVerificationCard user={user} />
            )}

            {/* Enhanced Profile Card with Gradient Border */}
            <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-6">
                    {/* Animated Avatar */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {user.image ? (
                          <img src={user.image} alt={user.name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                        )}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{user.name || 'No Name'}</h2>
                      <p className="text-slate-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">email</span>
                        {user.email}
                      </p>
                      
                      {/* Enhanced Badges */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 ${
                          user.role === 'PROVIDER' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                          user.role === 'ADMIN' ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white' :
                          'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        }`}>
                          <span className="material-symbols-outlined text-xs mr-1 align-middle">badge</span>
                          {user.role}
                        </span>

                        {user.isBanned && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm animate-pulse">
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">block</span>
                            Banned
                          </span>
                        )}

                        {user.deletionScheduledAt && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm">
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">schedule_delete</span>
                            Deletion Scheduled
                          </span>
                        )}

                        {user.subscription && (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                            user.subscription.plan === 'PRO' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' :
                            user.subscription.plan === 'BUSINESS' ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white' :
                            'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                          }`}>
                            <span className="material-symbols-outlined text-xs mr-1 align-middle">workspace_premium</span>
                            {user.subscription.plan}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex flex-col items-end gap-1 px-4 py-2 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 font-medium">Member Since</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">ID: {user.id.slice(0, 8)}...</p>
                  </div>
                </div>

                {/* Profile Information */}
                {user.profile && (
                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600">account_circle</span>
                      Profile Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-600 mt-0.5">location_on</span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Location</p>
                            <p className="text-slate-900 font-medium">{user.profile.location || 'N/A'}</p>
                            {user.profile.latitude && user.profile.longitude && (
                              <p className="text-xs text-slate-400 mt-1 font-mono">
                                {user.profile.latitude.toFixed(6)}, {user.profile.longitude.toFixed(6)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-600 mt-0.5">description</span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Bio</p>
                            <p className="text-slate-700 leading-relaxed">{user.profile.bio || 'No bio provided'}</p>
                          </div>
                        </div>
                      </div>

                      {user.role === 'PROVIDER' && (
                        <>
                          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                              <p className="text-xs text-emerald-700 uppercase font-semibold">Hourly Rate</p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-900">
                              KES {user.profile.hourlyRate || '—'}
                            </p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-blue-600 text-lg">verified</span>
                              <p className="text-xs text-blue-700 uppercase font-semibold">Status</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                              user.profile.verificationStatus === 'VERIFIED' ? 'bg-emerald-500 text-white' :
                              user.profile.verificationStatus === 'REJECTED' ? 'bg-red-500 text-white' :
                              'bg-amber-500 text-white'
                            }`}>
                              {user.profile.verificationStatus?.toLowerCase() || 'pending'}
                            </span>
                          </div>

                          {user.profile.skills && user.profile.skills.length > 0 && (
                            <div className="col-span-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-purple-600">psychology</span>
                                <p className="text-xs text-purple-700 uppercase font-semibold">Skills</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {user.profile.skills.map((skill, idx) => (
                                  <span 
                                    key={idx} 
                                    className="px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services Section with Enhanced Design */}
            {user.role === 'PROVIDER' && user.services && user.services.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/50">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">work</span>
                    Services ({user.services.length})
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {user.services.map((service: any) => (
                    <Link
                      key={service.id}
                      href={`/services/${service.id}`}
                      target="_blank"
                      className="group relative flex items-center justify-between p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                          {service.title}
                          <span className="material-symbols-outlined text-sm text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                        </p>
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">category</span>
                          {service.category.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-600">KES {service.price}</p>
                          <p className="text-xs text-slate-500">{service._count.bookings} bookings</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          service.isActive 
                            ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' 
                            : 'bg-red-500 text-white shadow-red-200 shadow-md'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs Section with Enhanced Design */}
            {user.role === 'CLIENT' && user.jobs && user.jobs.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">work_history</span>
                    Jobs Posted ({user.jobs.length})
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {user.jobs.map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      target="_blank"
                      className="group relative flex items-center justify-between p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                          {job.title}
                          <span className="material-symbols-outlined text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                        </p>
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">category</span>
                          {job.category.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            {job.budget ? `KES ${job.budget}` : 'Not set'}
                          </p>
                          <p className="text-xs text-slate-500">{job._count.proposals} proposals</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          job.status === 'OPEN' ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' :
                          job.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' :
                          job.status === 'COMPLETED' ? 'bg-purple-500 text-white shadow-purple-200 shadow-md' :
                          'bg-red-500 text-white shadow-red-200 shadow-md'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bookings with Timeline Design */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  <span className="material-symbols-outlined">calendar_month</span>
                  Recent Bookings
                </h3>
              </div>
              <div className="p-6">
                {user.bookings && user.bookings.length > 0 ? (
                  <div className="space-y-3">
                    {user.bookings.map((booking: any, idx: number) => (
                      <div 
                        key={booking.id} 
                        className="group relative flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            booking.status === 'COMPLETED' ? 'bg-emerald-500' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-500' :
                            booking.status === 'PENDING' ? 'bg-amber-500' :
                            'bg-red-500'
                          } shadow-lg`} />
                          {idx < user.bookings.length - 1 && (
                            <div className="w-0.5 h-14 bg-slate-200 my-1" />
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-bold text-slate-900 mb-1">
                            {booking.service?.title || 'Service N/A'}
                          </p>
                          <p className="text-sm text-slate-600 flex items-center gap-1 mb-2">
                            <span className="material-symbols-outlined text-xs">person</span>
                            {booking.client.id === user.id 
                              ? `Provider: ${booking.provider.name}` 
                              : `Client: ${booking.client.name}`}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {new Date(booking.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900 mb-2">
                            KES {booking.totalAmount}
                          </p>
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${
                            booking.status === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' :
                            booking.status === 'PENDING' ? 'bg-amber-500 text-white shadow-amber-200 shadow-md' :
                            booking.status === 'CANCELLED' ? 'bg-red-500 text-white shadow-red-200 shadow-md' :
                            'bg-purple-500 text-white shadow-purple-200 shadow-md'
                          }`}>
                            {booking.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-3">event_busy</span>
                    <p className="text-slate-500">No recent bookings found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Support Tickets */}
            {user.supportTickets && user.supportTickets.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">support_agent</span>
                    Support Tickets ({user.supportTickets.length})
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {user.supportTickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 mb-1">{ticket.subject}</p>
                          <p className="text-sm text-slate-600">{ticket.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            ticket.priority === 'URGENT' ? 'bg-red-500 text-white' :
                            ticket.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                            ticket.priority === 'MEDIUM' ? 'bg-amber-500 text-white' :
                            'bg-slate-400 text-white'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            ticket.status === 'RESOLVED' ? 'bg-emerald-500 text-white' :
                            ticket.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                            ticket.status === 'CLOSED' ? 'bg-slate-500 text-white' :
                            'bg-amber-500 text-white'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disputes */}
            {((user.disputes && user.disputes.length > 0) || (user.disputesAgainst && user.disputesAgainst.length > 0)) && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-xl shadow-red-100/50 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">gavel</span>
                    Disputes
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {user.disputes?.map((dispute: any) => (
                    <div key={dispute.id} className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border-2 border-red-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-red-900 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm">report</span>
                            Created by this user
                          </p>
                          <p className="text-sm text-red-700 mb-2">Against: {dispute.defendant.name}</p>
                          <p className="text-sm text-slate-700 line-clamp-2">{dispute.reason}</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          dispute.status === 'RESOLVED' ? 'bg-emerald-500 text-white' :
                          dispute.status === 'CLOSED' ? 'bg-slate-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {user.disputesAgainst?.map((dispute: any) => (
                    <div key={dispute.id} className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border-2 border-amber-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Against this user
                          </p>
                          <p className="text-sm text-amber-700 mb-2">By: {dispute.creator.name}</p>
                          <p className="text-sm text-slate-700 line-clamp-2">{dispute.reason}</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          dispute.status === 'RESOLVED' ? 'bg-emerald-500 text-white' :
                          dispute.status === 'CLOSED' ? 'bg-slate-500 text-white' :
                          'bg-amber-500 text-white'
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Enhanced Wallet Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-200/50">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  Wallet
                </h3>
              </div>
              
              <div className="p-6">
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl mb-6 overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                  
                  <div className="relative">
                    <p className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-2">Current Balance</p>
                    <p className="text-4xl font-bold mb-1">KES {user.wallet?.balance || '0.00'}</p>
                    <span className="material-symbols-outlined absolute top-0 right-0 text-6xl text-white/5">payments</span>
                  </div>
                </div>
                
                {user.wallet?.transactions && user.wallet.transactions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      Recent Transactions
                    </h4>
                    <div className="space-y-2">
                      {user.wallet.transactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200">
                          <div className="flex-1">
                            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold mb-1 ${
                              tx.type === 'CREDIT' || tx.type === 'EARNING' 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-600 text-white'
                            }`}>
                              {tx.type}
                            </span>
                            {tx.description && (
                              <p className="text-xs text-slate-500 mt-1">{tx.description}</p>
                            )}
                          </div>
                          <span className="text-lg font-bold text-slate-900">KES {tx.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Statistics Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-symbols-outlined">analytics</span>
                  Statistics
                </h3>
              </div>
              
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-lg">event</span>
                    Bookings
                  </span>
                  <span className="text-2xl font-bold text-blue-600">{user._count.bookings}</span>
                </div>

                {user.role === 'PROVIDER' && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-600 text-lg">work</span>
                      Services
                    </span>
                    <span className="text-2xl font-bold text-purple-600">{user._count.services}</span>
                  </div>
                )}

                {user.role === 'CLIENT' && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-lg">work_history</span>
                      Jobs
                    </span>
                    <span className="text-2xl font-bold text-blue-600">{user._count.jobs}</span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors duration-200">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">star</span>
                    Reviews Received
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">{user._count.receivedReviews}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors duration-200">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-lg">rate_review</span>
                    Reviews Written
                  </span>
                  <span className="text-2xl font-bold text-amber-600">{user._count.reviews}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors duration-200">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">chat</span>
                    Messages
                  </span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {user._count.sentMessages + user._count.receivedMessages}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 text-lg">support</span>
                    Tickets
                  </span>
                  <span className="text-2xl font-bold text-orange-600">{user._count.supportTickets}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Account Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-symbols-outlined">settings</span>
                  Account
                </h3>
              </div>
              
              <div className="p-6 space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-lg ${
                      user.onboardingCompleted ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {user.onboardingCompleted ? 'check_circle' : 'pending'}
                    </span>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Onboarding</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {user.onboardingCompleted ? 'Completed' : 'Incomplete'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-lg ${
                      user.emailVerified ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {user.emailVerified ? 'verified' : 'error'}
                    </span>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>

                {user.deletionScheduledAt && (
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-300">
                    <div className="flex items-center gap-2 mb-2" >
                      <span className="material-symbols-outlined text-orange-600">schedule_delete</span>
                      <p className="text-xs text-orange-700 uppercase font-bold">Deletion Alert</p>
                    </div>
                    <p className="text-sm font-bold text-orange-900 mb-2">
                      {new Date(user.deletionScheduledAt).toLocaleDateString()}
                    </p>
                    {user.deletionReason && (
                      <p className="text-xs text-orange-700 bg-white/50 p-2 rounded">{user.deletionReason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notifications Summary */}
            {user.notifications && user.notifications.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">notifications</span>
                    Notifications
                  </h3>
                </div>
                
                <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
                  {user.notifications.slice(0, 5).map((notif: any) => (
                    <div key={notif.id} className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl hover:shadow-md transition-all duration-200">
                      <p className="text-sm font-bold text-slate-900 mb-1">{notif.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{notif.message}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
