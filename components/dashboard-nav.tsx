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
  ChevronRight,
  Settings,
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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface DashboardNavProps {
  onClose?: () => void;
}

const navSections = [
  {
    label: 'Main',
    items: [
      { title: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Wallets', href: '/dashboard/wallets', icon: Wallet },
      { title: 'Categories', href: '/dashboard/categories', icon: Tags },
      { title: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'AI Insights', href: '/dashboard/insights', icon: Sparkles },
      { title: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'OCR Upload', href: '/dashboard/ocr', icon: ScanLine },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Account Settings', href: '/dashboard/profile', icon: Settings },
      { title: 'Logout', href: null, icon: LogOut, isLogout: true },
    ],
  },
];

export function DashboardNav({ onClose }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setIsCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const handleSignOut = async () => {
    await signOut();
    setOpenLogoutDialog(false);
    setTimeout(() => router.push('/auth?success=logout_success'), 200);
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        'flex h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-100 border-r border-slate-700/50 transition-all duration-300 shadow-2xl',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          'flex items-center border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm transition-all duration-300',
          isCollapsed ? 'justify-center p-4' : 'justify-between p-5'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="text-white font-bold text-lg" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Finance App</h1>
              <p className="text-xs text-slate-400">Track & Manage</p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="text-white font-bold text-lg" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="hidden lg:flex h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
        <TooltipProvider delayDuration={150}>
          {navSections.map((section) => (
            <div key={section.label}>
              {!isCollapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.label}
                </h3>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  // =====================
                  // LOGOUT WITH TOOLTIP
                  // =====================
                  if (item.isLogout) {
                    return (
                      <Tooltip key="logout-tooltip">
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setOpenLogoutDialog(true)}
                            className={cn(
                              'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
                              isCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3',
                              'text-red-400 hover:bg-red-600/10 hover:text-red-300'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </button>
                        </TooltipTrigger>

                        {isCollapsed && (
                          <TooltipContent side="right">
                            <p>Logout</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  }

                  // =====================
                  // NORMAL NAV ITEM
                  // =====================
                  const isActive = pathname === item.href;

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleNavClick(item.href!)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl font-medium transition-all duration-200',
                            isCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3',
                            isActive
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </button>
                      </TooltipTrigger>

                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* LOGOUT DIALOG */}
      <AlertDialog open={openLogoutDialog} onOpenChange={setOpenLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
  );
}
