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
  User,
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
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardNavProps {
  onClose?: () => void;
}

const navSections = [
  {
    label: 'Main',
    items: [
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
    ],
  },
  {
    label: 'Management',
    items: [
      {
        title: 'Wallets',
        href: '/dashboard/wallets',
        icon: Wallet,
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
    ],
  },
  {
    label: 'Insights',
    items: [
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
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        title: 'OCR Upload',
        href: '/dashboard/ocr',
        icon: ScanLine,
      },
    ],
  },
];

export function DashboardNav({ onClose }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user, profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  const userInitials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    user?.email
      ?.split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    'U';
  return (
    <div
      className={cn(
        'flex h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-100 border-r border-slate-700/50 transition-all duration-300 ease-in-out shadow-2xl',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Header with Logo */}
      <div
        className={cn(
          'flex items-center border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm transition-all duration-300',
          isCollapsed ? 'justify-center p-4' : 'justify-between p-5'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="text-white font-bold text-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                Finance App
              </h1>
              <p className="text-xs text-slate-400">Track & Manage</p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="text-white font-bold text-lg" />
          </div>
        )}

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

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="hidden lg:flex h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
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
                const isActive = pathname === item.href;

                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl font-medium transition-all duration-200 group relative overflow-hidden',
                      isCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    {/* Active indicator */}
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                    )}

                    {/* Icon with glow effect when active */}
                    <div className={cn(
                      'relative',
                      isActive && 'animate-pulse'
                    )}>
                      <Icon className="h-5 w-5 relative z-10" />
                      {isActive && (
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-full" />
                      )}
                    </div>

                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}

                    {/* Hover effect line */}
                    {!isActive && (
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-slate-700/50 p-3 bg-slate-900/50 backdrop-blur-sm">
        <button
          onClick={() => handleNavClick('/dashboard/profile')}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-slate-800/50 group',
            pathname === '/dashboard/profile' && 'bg-slate-800/70',
            isCollapsed && 'justify-center'
          )}
        >
          <Avatar className="h-9 w-9 border-2 border-emerald-500/30 group-hover:border-emerald-500/50 transition-colors">
            <AvatarImage
              src={profile?.avatar_url || ""}
              alt={profile?.full_name || user?.email}
            />
            <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-sm font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-400">View Profile</p>
            </div>
          )}

          {!isCollapsed && (
            <Settings className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          )}
        </button>
      </div>

      {/* Logout Button */}
      <div className="border-t border-slate-700/50 p-3 bg-slate-900/50">
        <AlertDialog open={openLogoutDialog} onOpenChange={setOpenLogoutDialog}>
          <AlertDialogTrigger asChild>
            <Button
              className={cn(
                'transition-all duration-200 bg-red-600/10 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:shadow-red-500/20 active:scale-95',
                isCollapsed
                  ? 'w-full h-12 p-0 flex items-center justify-center rounded-xl'
                  : 'w-full justify-start gap-3 rounded-xl font-medium px-4 py-3'
              )}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Logout</span>}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to logout?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You will be logged out and redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                className="bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20"
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