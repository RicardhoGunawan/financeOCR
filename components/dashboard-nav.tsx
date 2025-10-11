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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  onClose?: () => void;
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transaksi',
    href: '/dashboard/transactions',
    icon: Receipt,
  },
  {
    title: 'Kategori',
    href: '/dashboard/categories',
    icon: Tags,
  },
  {
    title: 'Analisis',
    href: '/dashboard/analytics',
    icon: BarChart3,
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
    await signOut();
    router.push('/auth');
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-200 h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm sm:text-lg">F</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm sm:text-base">Finance App</h1>
            <p className="text-xs text-slate-600 truncate max-w-[120px]">
              {user?.email}
            </p>
          </div>
        </div>
        {/* Close button for mobile */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
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
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-200">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </div>
  );
}