import React from 'react';

export default function ReferralPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Invite Friends & Earn Rewards
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Share your referral code and earn points for every friend who joins and books a service.
        </p>
      </div>

      <div className="mt-12 bg-white shadow overflow-hidden sm:rounded-lg max-w-3xl mx-auto">
         <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Your Referral Code</h3>
            <div className="mt-4 flex justify-center">
               <div className="bg-gray-100 rounded-md px-4 py-2 text-2xl font-mono font-bold text-blue-600 tracking-widest border border-gray-300">
                  JIT-12345
               </div>
            </div>
            <div className="mt-4">
               <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Copy Code
               </button>
            </div>
         </div>
         <div className="bg-gray-50 px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your Rewards</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
               <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                     <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Points
                     </dt>
                     <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        500
                     </dd>
                  </div>
               </div>
               <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                     <dt className="text-sm font-medium text-gray-500 truncate">
                        Redeemable Value
                     </dt>
                     <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        $5.00
                     </dd>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
