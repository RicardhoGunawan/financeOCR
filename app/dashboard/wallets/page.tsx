'use client';

import { useEffect, useState } from 'react';
import { supabase, Wallet, WalletWithStats, WalletTransfer } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Wallet as WalletIcon,
    CreditCard,
    Smartphone,
    Building2,
    TrendingUp,
    ArrowRightLeft,
    Edit,
    Trash2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const WALLET_TYPES = [
    { value: 'cash', label: 'Cash', icon: WalletIcon },
    { value: 'bank', label: 'Bank Account', icon: Building2 },
    { value: 'e-wallet', label: 'E-Wallet', icon: Smartphone },
    { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
    { value: 'investment', label: 'Investment', icon: TrendingUp },
    { value: 'other', label: 'Other', icon: WalletIcon },
];

const WALLET_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export default function WalletsPage() {
    const { user } = useAuth();
    const [wallets, setWallets] = useState<WalletWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'cash' as Wallet['type'],
        balance: '',
        description: '',
        color: WALLET_COLORS[0],
    });

    const [transferData, setTransferData] = useState({
        from_wallet_id: '',
        to_wallet_id: '',
        amount: '',
        note: '',
    });

    useEffect(() => {
        if (user) {
            loadWallets();
        }
    }, [user]);

    const loadWallets = async () => {
        try {
            setLoading(true);

            const { data: walletsData, error: walletsError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: true });

            if (walletsError) throw walletsError;

            const walletsWithStats = await Promise.all(
                (walletsData || []).map(async (wallet) => {
                    const { data: transactions } = await supabase
                        .from('transactions')
                        .select('amount, type')
                        .eq('wallet_id', wallet.id);

                    const totalIncome = transactions
                        ?.filter(t => t.type === 'income')
                        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

                    const totalExpense = transactions
                        ?.filter(t => t.type === 'expense')
                        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

                    return {
                        ...wallet,
                        transaction_count: transactions?.length || 0,
                        total_income: totalIncome,
                        total_expense: totalExpense,
                    } as WalletWithStats;
                })
            );

            setWallets(walletsWithStats);
        } catch (error) {
            console.error('Error loading wallets:', error);
            toast.error('Failed to load wallets');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const walletData = {
                user_id: user?.id,
                name: formData.name,
                type: formData.type,
                balance: parseFloat(formData.balance) || 0,
                description: formData.description || null,
                color: formData.color,
                icon: WALLET_TYPES.find(t => t.value === formData.type)?.label,
            };

            if (editingWallet) {
                const { balance, ...updateData } = walletData;

                const { error } = await supabase
                    .from('wallets')
                    .update(updateData)
                    .eq('id', editingWallet.id);

                if (error) throw error;
                toast.success('Wallet updated successfully');
            } else {
                const { error } = await supabase
                    .from('wallets')
                    .insert([walletData]);

                if (error) throw error;
                toast.success('Wallet added successfully');
            }

            setDialogOpen(false);
            resetForm();
            loadWallets();
        } catch (error) {
            console.error('Error saving wallet:', error);
            toast.error('Failed to save wallet');
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (transferData.from_wallet_id === transferData.to_wallet_id) {
            toast.error('Cannot transfer to the same wallet');
            return;
        }

        try {
            const amount = parseFloat(transferData.amount);

            const fromWallet = wallets.find(w => w.id === parseInt(transferData.from_wallet_id));
            if (!fromWallet || fromWallet.balance < amount) {
                toast.error('Insufficient balance');
                return;
            }

            const { error: transferError } = await supabase
                .from('wallet_transfers')
                .insert([{
                    user_id: user?.id,
                    from_wallet_id: parseInt(transferData.from_wallet_id),
                    to_wallet_id: parseInt(transferData.to_wallet_id),
                    amount: amount,
                    note: transferData.note || null,
                }]);

            if (transferError) throw transferError;

            await supabase
                .from('wallets')
                .update({ balance: fromWallet.balance - amount })
                .eq('id', parseInt(transferData.from_wallet_id));

            const toWallet = wallets.find(w => w.id === parseInt(transferData.to_wallet_id));
            if (toWallet) {
                await supabase
                    .from('wallets')
                    .update({ balance: toWallet.balance + amount })
                    .eq('id', parseInt(transferData.to_wallet_id));
            }

            toast.success('Transfer successful');
            setTransferDialogOpen(false);
            resetTransferForm();
            loadWallets();
        } catch (error) {
            console.error('Error transferring:', error);
            toast.error('Failed to transfer');
        }
    };

    const handleDelete = async (id: number) => {

        try {
            const { error } = await supabase
                .from('wallets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Wallet deleted successfully');
            loadWallets();
        } catch (error) {
            console.error('Error deleting wallet:', error);
            toast.error('Failed to delete wallet');
        }
    };

    const toggleActiveStatus = async (wallet: WalletWithStats) => {
        try {
            const { error } = await supabase
                .from('wallets')
                .update({ is_active: !wallet.is_active })
                .eq('id', wallet.id);

            if (error) throw error;
            toast.success(wallet.is_active ? 'Wallet deactivated' : 'Wallet activated');
            loadWallets();
        } catch (error) {
            console.error('Error toggling wallet:', error);
            toast.error('Failed to change wallet status');
        }
    };

    const openEditDialog = (wallet: Wallet) => {
        setEditingWallet(wallet);
        setFormData({
            name: wallet.name,
            type: wallet.type,
            balance: wallet.balance.toString(),
            description: wallet.description || '',
            color: wallet.color || WALLET_COLORS[0],
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setEditingWallet(null);
        setFormData({
            name: '',
            type: 'cash',
            balance: '',
            description: '',
            color: WALLET_COLORS[0],
        });
    };

    const resetTransferForm = () => {
        setTransferData({
            from_wallet_id: '',
            to_wallet_id: '',
            amount: '',
            note: '',
        });
    };

    const getWalletIcon = (type: string) => {
        const walletType = WALLET_TYPES.find(t => t.value === type);
        return walletType?.icon || WalletIcon;
    };

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const activeWallets = wallets.filter(w => w.is_active);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Wallets</h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1">
                        Manage all your wallets and financial accounts
                    </p>
                </div>
                <div className="flex gap-3">
                    <Dialog open={transferDialogOpen} onOpenChange={(open) => {
                        setTransferDialogOpen(open);
                        if (!open) resetTransferForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <ArrowRightLeft className="h-4 w-4" />
                                Transfer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Transfer Between Wallets</DialogTitle>
                                <DialogDescription>
                                    Move balance from one wallet to another
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleTransfer} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>From Wallet</Label>
                                    <Select
                                        value={transferData.from_wallet_id}
                                        onValueChange={(value) =>
                                            setTransferData({ ...transferData, from_wallet_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select wallet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeWallets.map((wallet) => (
                                                <SelectItem key={wallet.id} value={wallet.id.toString()}>
                                                    {wallet.name} ({formatRupiah(wallet.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>To Wallet</Label>
                                    <Select
                                        value={transferData.to_wallet_id}
                                        onValueChange={(value) =>
                                            setTransferData({ ...transferData, to_wallet_id: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select wallet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeWallets
                                                .filter(w => w.id.toString() !== transferData.from_wallet_id)
                                                .map((wallet) => (
                                                    <SelectItem key={wallet.id} value={wallet.id.toString()}>
                                                        {wallet.name} ({formatRupiah(wallet.balance)})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input
                                        type="number"
                                        step="1000"
                                        value={transferData.amount}
                                        onChange={(e) =>
                                            setTransferData({ ...transferData, amount: e.target.value })
                                        }
                                        placeholder="100000"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Note (optional)</Label>
                                    <Textarea
                                        value={transferData.note}
                                        onChange={(e) =>
                                            setTransferData({ ...transferData, note: e.target.value })
                                        }
                                        placeholder="Transfer for..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1">
                                        Transfer
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setTransferDialogOpen(false);
                                            resetTransferForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Wallet
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingWallet
                                        ? 'Update wallet information'
                                        : 'Create a new wallet to manage your finances'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Wallet Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., BCA Savings"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value: Wallet['type']) =>
                                                setFormData({ ...formData, type: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {WALLET_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Initial Balance</Label>
                                        <Input
                                            type="number"
                                            step="1000"
                                            value={formData.balance}
                                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                            placeholder="0"
                                            disabled={!!editingWallet}
                                        />
                                        {editingWallet && (
                                            <p className="text-xs text-slate-500">
                                                Balance cannot be changed directly. Use transactions or transfers.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <div className="flex gap-2">
                                        {WALLET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`h-10 w-10 rounded-full border-2 transition-all ${formData.color === color
                                                    ? 'border-slate-900 scale-110'
                                                    : 'border-slate-200'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setFormData({ ...formData, color })}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Description (optional)</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Notes about this wallet..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1">
                                        {editingWallet ? 'Update' : 'Add'} Wallet
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDialogOpen(false);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Total Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {formatRupiah(totalBalance)}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">All wallets</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Active Wallets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
                            {activeWallets.length}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Out of {wallets.length} total</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Total Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                            {wallets.reduce((sum, w) => sum + w.transaction_count, 0)}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">All wallets</p>
                    </CardContent>
                </Card>
            </div>

            {/* Wallets Grid */}
            {wallets.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <WalletIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            No Wallets Yet
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Create your first wallet to start managing your finances
                        </p>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Wallet
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {wallets.map((wallet) => {
                        const Icon = getWalletIcon(wallet.type);

                        return (
                            <Card
                                key={wallet.id}
                                className={`transition-all hover:shadow-lg ${!wallet.is_active ? 'opacity-60' : ''
                                    }`}
                            >
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-12 w-12 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: wallet.color || '#10b981' }}
                                            >
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 text-lg">
                                                    {wallet.name}
                                                </h3>
                                                <Badge variant="outline" className="text-xs">
                                                    {WALLET_TYPES.find(t => t.value === wallet.type)?.label}
                                                </Badge>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleActiveStatus(wallet)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            {wallet.is_active ? (
                                                <Eye className="h-5 w-5" />
                                            ) : (
                                                <EyeOff className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-sm text-slate-600 mb-1">Balance</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {formatRupiah(wallet.balance)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                        <div>
                                            <p className="text-slate-600">Income</p>
                                            <p className="font-semibold text-green-600">
                                                {formatRupiah(wallet.total_income)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600">Expense</p>
                                            <p className="font-semibold text-red-600">
                                                {formatRupiah(wallet.total_expense)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
                                        <span>{wallet.transaction_count} transactions</span>
                                        {wallet.description && (
                                            <span className="truncate ml-2">{wallet.description}</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openEditDialog(wallet)}
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edit
                                        </Button>
                                        <ConfirmDialog
                                            title="Are you sure?"
                                            description="This action will permanently remove the selected data from the system. Please confirm to continue."
                                            onConfirm={() => handleDelete(wallet.id)}
                                            confirmText="Delete"
                                            isDestructive={true} // This will apply the red style to the delete button
                                        >
                                            {/* This is the trigger element (children) */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 sm:h-10 sm:w-10"
                                            >
                                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                            </Button>
                                        </ConfirmDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}