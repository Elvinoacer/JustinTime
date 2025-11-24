import React from 'react';

export default function ClientMessagesPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Messages</h2>
          <div className="mt-2">
            <input type="text" placeholder="Search messages..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {[1, 2, 3].map((item) => (
            <li key={item} className="p-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <span className="inline-block h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                    <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Provider Name {item}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    Yes, I can do that for you.
                  </p>
                </div>
                <div>
                   <span className="text-xs text-gray-400">11:30 AM</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Provider Name 1</h3>
          <button className="text-gray-400 hover:text-gray-500">
             <span className="sr-only">More options</span>
             <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
             </svg>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
           <div className="flex justify-end">
              <div className="bg-blue-600 p-3 rounded-lg shadow-sm max-w-xs text-sm text-white">
                 Hi, are you available for a plumbing job tomorrow?
              </div>
           </div>
           <div className="flex justify-start">
              <div className="bg-white p-3 rounded-lg shadow-sm max-w-xs text-sm text-gray-700">
                 Yes, I am available. What time works for you?
              </div>
           </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <button className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
