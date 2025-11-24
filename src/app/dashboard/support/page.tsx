import React from 'react';

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Support & Help Center</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Support</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Need help with an order or have a question? Send us a message.</p>
          </div>
          <form className="mt-5 space-y-4">
             <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                <div className="mt-1">
                   <input type="text" name="subject" id="subject" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
             </div>
             <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                <div className="mt-1">
                   <textarea id="message" name="message" rows={4} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
                </div>
             </div>
             <div className="flex justify-end">
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                   Send Message
                </button>
             </div>
          </form>
        </div>
      </div>

      <div>
         <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Frequently Asked Questions</h3>
         <dl className="space-y-6 divide-y divide-gray-200">
            <div className="pt-6">
               <dt className="text-base font-medium text-gray-900">
                  How do I get paid?
               </dt>
               <dd className="mt-2 text-base text-gray-500">
                  Payments are processed securely through our platform. You can withdraw your earnings to your bank account or mobile money wallet.
               </dd>
            </div>
            <div className="pt-6">
               <dt className="text-base font-medium text-gray-900">
                  How do I cancel a booking?
               </dt>
               <dd className="mt-2 text-base text-gray-500">
                  You can cancel a booking from the Bookings page. Please note that cancellation fees may apply depending on the timing.
               </dd>
            </div>
         </dl>
      </div>
    </div>
  );
}
