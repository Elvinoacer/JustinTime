import React from 'react';

export default function JobRequestsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Job Requests</h1>
      
      <div className="space-y-4">
        {/* Placeholder for Job Request Card */}
        {[1, 2].map((item) => (
          <div key={item} className="bg-white shadow sm:rounded-lg p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  House Cleaning Service
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Client: Jane Doe</p>
                  <p>Location: 123 Main St, Cityville</p>
                  <p>Date: Tomorrow, 10:00 AM</p>
                </div>
              </div>
              <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
                <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Accept
                </button>
                <button type="button" className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
