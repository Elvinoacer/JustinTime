'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been successfully verified!');
          // Optional: Redirect after a few seconds
          // setTimeout(() => router.push('/auth/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            {status === 'loading' && (
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center"
              >
                <XCircle className="w-10 h-10 text-red-600" />
              </motion.div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {status === 'loading' ? 'Verifying Email' : 
             status === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </h1>
          
          <p className="text-slate-600 mb-8">
            {message}
          </p>

          {status === 'loading' && (
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px] mx-auto">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          )}

          {status === 'success' && (
            <Link 
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] w-full"
            >
              Continue to Login
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Link 
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all w-full"
              >
                Back to Login
              </Link>
              <p className="text-xs text-slate-400">
                If the problem persists, please contact support.
              </p>
            </div>
          )}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
