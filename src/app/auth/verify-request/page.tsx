'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-indigo-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Check your email
          </h1>
          
          <p className="text-slate-600 mb-8">
            We've sent a verification link to <span className="font-semibold text-slate-900">{email || 'your email address'}</span>.
            <br />
            Please click the link to verify your account.
          </p>

          <div className="space-y-4">
            <Link 
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all w-full"
            >
              Back to Login
            </Link>
            
            <p className="text-xs text-slate-400">
              Didn't receive the email? Check your spam folder or <Link href="/auth/signup" className="text-indigo-600 hover:underline">try again</Link>.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} JustInTime. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyRequestContent />
    </Suspense>
  );
}
