import React from 'react';

export default function JobProposalsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Proposals for &quot;Need a Plumber&quot;</h1>
      
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-white shadow sm:rounded-lg p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center">
                 <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200"></div>
                 <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Provider Name</h3>
                    <div className="flex items-center mt-1">
                       <svg className="flex-shrink-0 h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                       </svg>
                       <p className="ml-1 text-sm text-gray-500">4.9 (120 reviews)</p>
                    </div>
                 </div>
              </div>
              <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
                 <p className="text-2xl font-bold text-gray-900 mr-6">$80</p>
                <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Hire
                </button>
                <button type="button" className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Message
                </button>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
               <p>I have 5 years of experience in plumbing and can fix this issue quickly. I am available tomorrow morning.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
