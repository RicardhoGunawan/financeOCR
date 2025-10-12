'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Receipt,
  Tags,
  BarChart3,
  ScanLine,
  LogOut,
  X,
  Wallet,
  PiggyBank,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  onClose?: () => void;
}

const navItems = [
  {
    title: 'OverView',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/dashboard/transactions',
    icon: Receipt,
  },
  {
    title: 'Categories',
    href: '/dashboard/categories',
    icon: Tags,
  },
  {
    title: 'Budgets',
    href: '/dashboard/budgets',
    icon: PiggyBank,
  },

  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Insights',
    href: '/dashboard/insights',
    icon: BrainCircuit,
  },
  {
    title: 'OCR Upload',
    href: '/dashboard/ocr',
    icon: ScanLine,
  },
];

export function DashboardNav({ onClose }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;

    await signOut();
    setTimeout(() => router.push('/'), 100);
  };



  const handleNavClick = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Wallet className="text-white font-bold text-sm sm:text-lg" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm sm:text-base">Finance App</h1>
            <p className="text-xs text-slate-400 truncate max-w-[120px]">
              {user?.email}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-800">
        <Button
          onClick={handleSignOut}
          className="w-full justify-start gap-3 bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </div>
  );
}
