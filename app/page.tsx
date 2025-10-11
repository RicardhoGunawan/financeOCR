'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Receipt, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-6">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Financial Manager
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Smart financial management powered by AI. Track expenses, analyze spending, and extract data from receipts automatically.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              AI-Powered OCR
            </h3>
            <p className="text-slate-600">
              Upload receipts and invoices. Our AI automatically extracts amounts, dates, and merchant information using Google Gemini.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Visual Analytics
            </h3>
            <p className="text-slate-600">
              Beautiful charts and graphs help you understand your spending patterns and make informed financial decisions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Secure & Private
            </h3>
            <p className="text-slate-600">
              Your financial data is protected with enterprise-grade security. Row-level security ensures only you can access your information.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600">
            Built with Next.js, Supabase, and Google Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
}
