import React from 'react';

export default function ClientSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Account Settings</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Manage your account information and preferences.</p>
          </div>
          
          <form className="mt-5 space-y-6">
             <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1">
                   <input type="text" name="name" id="name" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="John Doe" />
                </div>
             </div>

             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                   <input type="email" name="email" id="email" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="you@example.com" />
                </div>
             </div>

             <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="mt-1">
                   <input type="password" name="password" id="password" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
             </div>

             <div className="flex items-start">
                <div className="flex items-center h-5">
                   <input id="notifications" name="notifications" type="checkbox" className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                   <label htmlFor="notifications" className="font-medium text-gray-700">Email Notifications</label>
                   <p className="text-gray-500">Receive emails about job updates and messages.</p>
                </div>
             </div>

             <div className="pt-5">
                <div className="flex justify-end">
                   <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Cancel
                   </button>
                   <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Save Changes
                   </button>
                </div>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
