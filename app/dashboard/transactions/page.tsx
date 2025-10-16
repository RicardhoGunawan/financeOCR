'use client';

import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from './data-table';
import { createColumns, TransactionWithWallet } from './columns';

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithWallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithWallet | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [deleteTransaction, setDeleteTransaction] =
    useState<TransactionWithWallet | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    note: '',
    wallet_id: '',
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadCategories();
      loadWallets();
    }
  }, [user]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          *,
          category:categories(*),
          wallet:wallets(id, name, color)
        `
        )
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadWallets = async () => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .order('name');
    setWallets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.wallet_id) {
      toast.error('Please select a wallet');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      const walletId = parseInt(formData.wallet_id);

      // Get current wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (!walletData) {
        toast.error('Wallet not found');
        return;
      }

      const transactionData = {
        user_id: user?.id,
        title: formData.title,
        amount: amount,
        type: formData.type,
        date: formData.date,
        category_id: formData.category_id
          ? parseInt(formData.category_id)
          : null,
        note: formData.note || null,
        wallet_id: walletId,
        source: 'manual' as const,
      };

      if (editingTransaction) {
        // When editing, we need to reverse the old transaction first
        const oldAmount = Number(editingTransaction.amount);
        const oldType = editingTransaction.type;
        const oldWalletId = editingTransaction.wallet_id;

        // Reverse old transaction on old wallet
        if (oldWalletId) {
          const { data: oldWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', oldWalletId)
            .single();

          if (oldWallet) {
            const reversedBalance =
              oldType === 'income'
                ? oldWallet.balance - oldAmount
                : oldWallet.balance + oldAmount;

            await supabase
              .from('wallets')
              .update({ balance: reversedBalance })
              .eq('id', oldWalletId);
          }
        }

        // Update transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;

        // Apply new transaction to new wallet
        const newBalance =
          formData.type === 'income'
            ? walletData.balance + amount
            : walletData.balance - amount;

        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', walletId);

        toast.success('Transaction updated successfully');
      } else {
        // Insert new transaction
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;

        // Update wallet balance
        const newBalance =
          formData.type === 'income'
            ? walletData.balance + amount
            : walletData.balance - amount;

        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', walletId);

        toast.success('Transaction added successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadTransactions();
      loadWallets();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    }
  };

  const handleDelete = async (transaction: TransactionWithWallet) => {
    try {
      // Reverse the transaction on the wallet
      if (transaction.wallet_id) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', transaction.wallet_id)
          .single();

        if (wallet) {
          const newBalance =
            transaction.type === 'income'
              ? wallet.balance - Number(transaction.amount)
              : wallet.balance + Number(transaction.amount);

          await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', transaction.wallet_id);
        }
      }

      // Delete transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Transaction deleted successfully');
      loadTransactions();
      loadWallets();
      setDeleteTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const openEditDialog = (transaction: TransactionWithWallet) => {
    setEditingTransaction(transaction);
    setFormData({
      title: transaction.title,
      amount: transaction.amount.toString(),
      type: transaction.type,
      date: transaction.date,
      category_id: transaction.category_id?.toString() || '',
      note: transaction.note || '',
      wallet_id: transaction.wallet_id?.toString() || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      title: '',
      amount: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      note: '',
      wallet_id: '',
    });
  };

  const columns = createColumns(
    openEditDialog,
    (transaction) => setDeleteTransaction(transaction)
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Transactions
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage your income and expenses across all wallets
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Add Transaction</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-[500px] p-0 flex flex-col max-h-[95vh]">
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle className="text-lg sm:text-xl">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingTransaction
                  ? 'Update the transaction details below'
                  : 'Enter the transaction details below'}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="title" className="text-xs sm:text-sm">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Monthly groceries"
                    required
                    className="text-sm h-9 sm:h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="amount" className="text-xs sm:text-sm">
                      Amount
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="1"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0"
                      required
                      className="text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="type" className="text-xs sm:text-sm">
                      Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger className="text-sm h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="wallet" className="text-xs sm:text-sm">
                    Wallet
                  </Label>
                  <Select
                    value={formData.wallet_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, wallet_id: value })
                    }
                    required
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: wallet.color }}
                            />
                            {wallet.name} ({formatRupiah(wallet.balance)})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="date" className="text-xs sm:text-sm">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                      className="text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="category" className="text-xs sm:text-sm">
                      Category
                    </Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                    >
                      <SelectTrigger className="text-sm h-9 sm:h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((cat) => cat.type === formData.type)
                          .map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="note" className="text-xs sm:text-sm">
                    Note (optional)
                  </Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    placeholder="Add additional details..."
                    className="text-sm resize-none min-h-[80px] sm:min-h-[100px]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-50">
                <Button type="submit" className="w-full h-9 sm:h-10 text-sm">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto h-9 sm:h-10 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={transactions} />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteTransaction && (
        <ConfirmDialog
          title="Delete Transaction"
          description="Are you sure you want to delete this transaction? This action cannot be undone and will update your wallet balance."
          onConfirm={() => handleDelete(deleteTransaction)}
          confirmText="Delete"
          isDestructive={true}
          open={!!deleteTransaction}
          onOpenChange={(open) => !open && setDeleteTransaction(null)}
        >
          <div />
        </ConfirmDialog>
      )}
    </div>
  );
}