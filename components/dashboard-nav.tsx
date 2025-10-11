'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  Tags,
  LogOut,
  User
} from 'lucide-react';

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/dashboard/transactions',
    icon: Wallet,
  },
  {
    title: 'OCR Upload',
    href: '/dashboard/ocr',
    icon: Receipt,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: TrendingUp,
  },
  {
    title: 'Categories',
    href: '/dashboard/categories',
    icon: Tags,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Wallet className="h-6 w-6 text-emerald-500 mr-2" />
        <span className="text-lg font-semibold">FinanceTracker</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
