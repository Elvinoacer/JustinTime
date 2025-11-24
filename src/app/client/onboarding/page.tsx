import React from 'react';
import Link from 'next/link';

export default function ClientOnboardingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Find the perfect professional
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Get your to-do list done. Hire trusted professionals for any job, big or small.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <Link href="/client/post-job" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Post a Job
              </Link>
            </div>
            <div className="ml-3 inline-flex">
              <Link href="/services" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
