import React from 'react';

export default function SubscriptionPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Upgrade your plan
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Get more visibility, lower fees, and premium support.
        </p>
      </div>

      <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
        {/* Basic Plan */}
        <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
          <div className="p-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Basic</h2>
            <p className="mt-4 text-sm text-gray-500">For starters.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">Free</span>
            </p>
            <a href="#" className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700">
              Current Plan
            </a>
          </div>
          <div className="pt-6 pb-8 px-6">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What&apos;s included</h3>
            <ul className="mt-6 space-y-4">
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">5 Bids per month</span>
              </li>
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">Standard Support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
          <div className="p-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Pro</h2>
            <p className="mt-4 text-sm text-gray-500">For growing businesses.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">$29</span>
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <a href="#" className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700">
              Upgrade to Pro
            </a>
          </div>
          <div className="pt-6 pb-8 px-6">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What&apos;s included</h3>
            <ul className="mt-6 space-y-4">
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">50 Bids per month</span>
              </li>
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">Priority Support</span>
              </li>
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">Featured Profile</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Business Plan */}
        <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
          <div className="p-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Business</h2>
            <p className="mt-4 text-sm text-gray-500">For established agencies.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">$99</span>
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <a href="#" className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700">
              Upgrade to Business
            </a>
          </div>
          <div className="pt-6 pb-8 px-6">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What&apos;s included</h3>
            <ul className="mt-6 space-y-4">
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">Unlimited Bids</span>
              </li>
              <li className="flex space-x-3">
                <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-500">Dedicated Account Manager</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
