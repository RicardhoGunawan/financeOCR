'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Play,
  Sparkles,
  Target,
  PieChart,
  DollarSign,
  ArrowRightLeft,
  Brain,
  Lock,
  Cloud,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const sectionRef = useRef(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  // ✅ Auto redirect ke dashboard jika user sudah login
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && videoRef.current) {
            // videoRef.current.play();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const features = [
    {
      icon: Receipt,
      title: 'AI-Powered Receipt Scanner',
      description:
        'Upload receipts and our AI automatically extracts amounts, dates, merchants, and categories using Google Gemini Vision.',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Wallet,
      title: 'Multi-Wallet Management',
      description:
        'Manage multiple wallets including cash, bank accounts, e-wallets, credit cards, and investments all in one place.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: PieChart,
      title: 'Smart Analytics',
      description:
        'Beautiful charts and visualizations help you understand spending patterns, income sources, and financial trends.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Target,
      title: 'Budget Tracking',
      description:
        'Set monthly budgets by category and get real-time alerts when you approach or exceed your limits.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Brain,
      title: 'AI Financial Insights',
      description:
        'Get personalized recommendations and insights powered by AI to optimize your spending and saving habits.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: ArrowRightLeft,
      title: 'Wallet Transfers',
      description:
        'Easily transfer money between wallets with full transaction history and balance tracking.',
      gradient: 'from-teal-500 to-green-500',
    },
  ];

  const benefits = [
    'Track all expenses in real-time',
    'Automatic categorization with AI',
    'Multi-currency support',
    'Secure cloud backup',
    'Mobile responsive design',
    'Free to get started',
  ];

  // ✅ Jangan render halaman home jika user sudah login (redirect handled by useEffect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 md:w-96 md:h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold">Finance</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/auth">
                <button className="text-slate-300 hover:text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm md:text-base">
                  Sign In
                </button>
              </Link>
              <Link href="/auth">
                <button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 sm:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-24 md:pb-32 px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">AI-Powered Financial Management</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight px-4">
            Take Control of Your
            <br />
            Financial Future
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed px-4">
            Manage your finances smarter with AI-powered insights, automatic receipt scanning,
            multi-wallet management, and beautiful analytics.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 md:mb-16 px-4">
            <Link href="/auth" className="text-base sm:text-lg px-6 sm:px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
              Start Free
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-slate-800/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-medium">Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">
              Everything You Need to
              <br />
              Manage Your Money
            </h2>
            <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              Powerful features designed to make financial management effortless and intelligent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-slate-600 rounded-xl p-5 sm:p-6 transition-all hover:scale-105 group"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full mb-3 sm:mb-4">
                <span className="text-xs sm:text-sm font-medium">Why Choose Us</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                Built for Modern
                <br />
                Financial Management
              </h2>
              <p className="text-slate-400 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed">
                We combine cutting-edge AI technology with intuitive design to give you complete
                control over your finances. From automatic receipt scanning to intelligent insights,
                every feature is designed with you in mind.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs sm:text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-8 lg:mt-0">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/50 backdrop-blur-xl p-5 sm:p-6 md:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-4 sm:p-6 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-400">Total Balance</span>
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">$12,450.80</div>
                    <div className="text-xs text-emerald-400 mt-1">+12.5% this month</div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 sm:p-6 rounded-lg border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-400">Active Wallets</span>
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">5 Wallets</div>
                    <div className="text-xs text-slate-400 mt-1">Cash, Bank, E-wallet</div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 sm:p-6 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-400">This Month</span>
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">248 Transactions</div>
                    <div className="text-xs text-red-400 mt-1">-$3,240 expenses</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-slate-800/30">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
                Ready to Take Control?
              </h2>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                Join thousands of users who are already managing their finances smarter with
                FinanceFlow.
              </p>

              <button className="bg-white text-emerald-600 hover:bg-slate-100 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-medium transition-all inline-flex items-center gap-2">
                Start Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <p className="text-white/70 text-xs sm:text-sm mt-3 sm:mt-4">
                Free forever plan available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto text-center text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold text-white">Finance</span>
          </div>
          <p className="mb-3 sm:mb-4 text-xs sm:text-sm">Built with Love by Finance Team❤️</p>
          <p className="text-xs sm:text-sm">© 2025 Finance. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}