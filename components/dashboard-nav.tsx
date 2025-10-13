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
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface DashboardNavProps {
  onClose?: () => void;
}

const navItems = [
  {
    title: 'Overview',
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
    title: 'Wallets',
    href: '/dashboard/wallets',
    icon: Wallet,
  },
  {
    title: 'Budgets',
    href: '/dashboard/budgets',
    icon: PiggyBank,
  },
  {
    title: 'AI Insights',
    href: '/dashboard/insights',
    icon: Sparkles,
  },
  {
    title: 'Analytics',
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Hydration fix
  useEffect(() => {
    setIsMounted(true);
    // Get collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpenLogoutDialog(false);
    setTimeout(() => router.push('/auth'), 300);
  };


  const handleNavClick = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn(
      'flex h-screen flex-col bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-300 ease-in-out',
      isCollapsed ? 'w-20' : 'w-64'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between border-b border-slate-800 transition-all duration-300',
        isCollapsed ? 'p-3' : 'p-4 sm:p-6'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Wallet className="text-white font-bold text-sm sm:text-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm sm:text-base">Finance App</h1>
              <p className="text-xs text-slate-400 truncate max-w-[120px]">
                {user?.email}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mx-auto">
            <Wallet className="text-white font-bold text-sm sm:text-lg" />
          </div>
        )}

        {/* Close button for mobile */}
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

        {/* Collapse button for desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="hidden lg:flex h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 sm:p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg font-medium transition-all duration-150',
                isCollapsed ? 'justify-center p-3' : 'justify-start px-3 py-2.5 text-sm',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        'border-t border-slate-800 transition-all duration-300',
        isCollapsed ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
      )}>
        <AlertDialog open={openLogoutDialog} onOpenChange={setOpenLogoutDialog}>
          <AlertDialogTrigger asChild>
            <Button
              className={cn(
                'transition-all duration-200 bg-red-600/10 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95',
                isCollapsed
                  ? 'w-12 h-12 p-0 flex items-center justify-center rounded-xl'
                  : 'w-full justify-start gap-3 rounded-xl font-medium'
              )}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Logout</span>}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                You’ll be signed out and redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}