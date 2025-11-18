// components/dashboard-header.tsx
"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Settings, LogOut, Menu, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

interface DashboardHeaderProps {
    onMenuClick?: () => void;
    showMobileMenu?: boolean;
}

export function DashboardHeader({
    onMenuClick,
    showMobileMenu = true,
}: DashboardHeaderProps) {
    const { user, profile } = useAuth();
    const router = useRouter();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            const { data: insights } = await supabase
                .from("insights")
                .select("*")
                .eq("user_id", user?.id)
                .eq("is_read", false)
                .order("created_at", { ascending: false })
                .limit(5);

            if (insights) {
                setNotifications(insights);
                setUnreadCount(insights.length);
            }
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/auth");
    };

    const handleSignOut = async () => {
        await handleLogout();
        setOpenLogoutDialog(false);
    };

    const handleViewNotifications = () => {
        router.push("/dashboard/insights");
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-700/50 sticky top-0 z-30 shadow-lg backdrop-blur-sm">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    
                    {showMobileMenu && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onMenuClick}
                            className="lg:hidden h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}

                    <div className="flex-1 flex items-center justify-center lg:justify-start px-4">
                        <h2 className="text-slate-400 text-sm font-medium hidden lg:block">
                            Welcome back,{" "}
                            <span className="text-white">
                                {profile?.full_name?.split(" ")[0] || "User"}
                            </span>{" "}
                            👋
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">

                        {/* NOTIFICATIONS */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                                >
                                    <Bell className="h-[18px] w-[18px]" />
                                    {unreadCount > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-emerald-500 hover:bg-emerald-600 border-2 border-slate-900"
                                        >
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="w-80 bg-slate-900 border-slate-700 text-slate-100 shadow-xl"
                            >
                                <DropdownMenuLabel className="flex items-center justify-between text-white py-3">
                                    <span className="text-base font-semibold">
                                        Notifications
                                    </span>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator className="bg-slate-700" />

                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">
                                                No new notifications
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {notifications.map((notif) => (
                                                <DropdownMenuItem
                                                    key={notif.id}
                                                    onClick={handleViewNotifications}
                                                    className="flex flex-col items-start py-3 px-4 cursor-pointer hover:bg-slate-800"
                                                >
                                                    <div className="flex items-start justify-between w-full mb-1">
                                                        <span className="font-medium text-sm text-white">
                                                            {notif.title}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 ml-2">
                                                            {formatTime(notif.created_at)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {notif.description}
                                                    </span>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {notifications.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator className="bg-slate-700" />
                                        <DropdownMenuItem
                                            onClick={handleViewNotifications}
                                            className="text-center justify-center text-emerald-400 hover:text-emerald-300 font-medium hover:bg-slate-800 py-3"
                                        >
                                            View all notifications
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* USER PROFILE */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 h-9 py-1 px-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                                >
                                    <Avatar className="h-7 w-7 ring-2 ring-emerald-500/30">
                                        <AvatarImage
                                            src={profile?.avatar_url || ""}
                                            alt={profile?.full_name || "User"}
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white text-xs font-semibold">
                                            {getInitials(profile?.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium text-white leading-tight">
                                            {profile?.full_name || "User"}
                                        </span>
                                        <span className="text-[11px] text-slate-400 leading-tight">
                                            {user?.email}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="w-56 bg-slate-900 border-slate-700 text-slate-100 shadow-xl"
                            >
                                <DropdownMenuLabel className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 ring-2 ring-emerald-500/30">
                                            <AvatarImage
                                                src={profile?.avatar_url || ""}
                                                alt={profile?.full_name || "User"}
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white text-sm font-semibold">
                                                {getInitials(profile?.full_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white text-sm">
                                                {profile?.full_name || "User"}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {user?.email}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator className="bg-slate-700" />

                                <DropdownMenuItem
                                    onClick={() => router.push("/dashboard/profile")}
                                    className="hover:bg-slate-800 py-2.5 cursor-pointer"
                                >
                                    <User className="mr-3 h-[18px] w-[18px]" />
                                    <span className="text-sm">Profile</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-slate-700" />

                                {/* OPEN LOGOUT DIALOG */}
                                <DropdownMenuItem
                                    onClick={() => setOpenLogoutDialog(true)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2.5 cursor-pointer"
                                >
                                    <LogOut className="mr-3 h-[18px] w-[18px]" />
                                    <span className="text-sm">Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* LOGOUT ALERT DIALOG */}
                        <AlertDialog
                            open={openLogoutDialog}
                            onOpenChange={setOpenLogoutDialog}
                        >
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Are you sure you want to logout?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You will be redirected to the login page.
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
            </div>
        </header>
    );
}
