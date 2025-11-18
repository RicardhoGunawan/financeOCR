'use client';

import { useEffect, useState } from 'react';
import { supabase, Category, Budget, BudgetWithSpent } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatting';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle2, TrendingUp, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BudgetsPage() {
  const { user, profile } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    month: selectedMonth.toString(),
    year: selectedYear.toString(),
  });

  // Copy dialog state
  const [copyFromMonth, setCopyFromMonth] = useState('');
  const [copyFromYear, setCopyFromYear] = useState('');

  const userCurrency = profile?.currency;

  useEffect(() => {
    if (user) {
      loadCategories();
      loadBudgets();
    }
  }, [user, selectedMonth, selectedYear]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (budgetsError) throw budgetsError;

      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const startDate = new Date(selectedYear, selectedMonth - 1, 1);
          const endDate = new Date(selectedYear, selectedMonth, 0);

          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user?.id)
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

          const spent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const percentage = (spent / budget.amount) * 100;
          const remaining = budget.amount - spent;

          return {
            ...budget,
            spent,
            percentage: Math.min(percentage, 100),
            remaining,
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const copyBudgetsFromMonth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!copyFromMonth || !copyFromYear) {
      toast.error('Please select a month and year to copy from');
      return;
    }

    const fromMonth = parseInt(copyFromMonth);
    const fromYear = parseInt(copyFromYear);

    // Check if trying to copy from the same month/year
    if (fromMonth === selectedMonth && fromYear === selectedYear) {
      toast.error('Cannot copy from the same month and year');
      return;
    }

    try {
      setCopying(true);

      // Get budgets from selected month
      const { data: previousBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user?.id)
        .eq('month', fromMonth)
        .eq('year', fromYear);

      if (fetchError) throw fetchError;

      if (!previousBudgets || previousBudgets.length === 0) {
        toast.error(`No budgets found for ${MONTHS[fromMonth - 1]} ${fromYear}`);
        return;
      }

      // Check if budgets already exist for current month
      const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('category_id')
        .eq('user_id', user?.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      const existingCategoryIds = new Set(existingBudgets?.map(b => b.category_id) || []);

      // Filter out budgets that already exist
      const budgetsToCreate = previousBudgets
        .filter(budget => !existingCategoryIds.has(budget.category_id))
        .map(budget => ({
          user_id: user?.id,
          category_id: budget.category_id,
          amount: budget.amount,
          month: selectedMonth,
          year: selectedYear,
        }));

      if (budgetsToCreate.length === 0) {
        toast.info(`All budgets from ${MONTHS[fromMonth - 1]} ${fromYear} already exist for this period`);
        setCopyDialogOpen(false);
        resetCopyForm();
        return;
      }

      // Insert new budgets
      const { error: insertError } = await supabase
        .from('budgets')
        .insert(budgetsToCreate);

      if (insertError) throw insertError;

      const skippedCount = previousBudgets.length - budgetsToCreate.length;
      
      if (skippedCount > 0) {
        toast.success(
          `Copied ${budgetsToCreate.length} budget(s) from ${MONTHS[fromMonth - 1]} ${fromYear}. ${skippedCount} already existed.`
        );
      } else {
        toast.success(`Successfully copied ${budgetsToCreate.length} budget(s) from ${MONTHS[fromMonth - 1]} ${fromYear}`);
      }

      setCopyDialogOpen(false);
      resetCopyForm();
      loadBudgets();
    } catch (error) {
      console.error('Error copying budgets:', error);
      toast.error('Failed to copy budgets');
    } finally {
      setCopying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const budgetData = {
        user_id: user?.id,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;
        toast.success('Budget updated successfully');
      } else {
        const { error } = await supabase.from('budgets').insert([budgetData]);

        if (error) {
          if (error.code === '23505') {
            toast.error('A budget for this category already exists in the same month/year');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Budget added successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      toast.success('Budget deleted successfully');
      loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id.toString(),
      amount: budget.amount.toString(),
      month: budget.month.toString(),
      year: budget.year.toString(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBudget(null);
    setFormData({
      category_id: '',
      amount: '',
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
    });
  };

  const resetCopyForm = () => {
    setCopyFromMonth('');
    setCopyFromYear('');
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    return 'text-green-600';
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Budget Management</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage your monthly budgets by category
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Copy Budget Dialog */}
          <Dialog 
            open={copyDialogOpen} 
            onOpenChange={(open) => {
              setCopyDialogOpen(open);
              if (!open) resetCopyForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Copy className="h-4 w-4" />
                Copy Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[100vw] h-[100dvh] sm:w-[95vw] sm:h-auto sm:max-w-[425px] p-0 flex flex-col sm:max-h-[90vh] sm:rounded-lg rounded-none">
              <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
                <DialogTitle className="text-lg sm:text-xl">Copy Budget from Another Month</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Select a month to copy budgets to {MONTHS[selectedMonth - 1]} {selectedYear}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={copyBudgetsFromMonth} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-3 sm:space-y-4 overscroll-contain">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <strong>Current Target:</strong> {MONTHS[selectedMonth - 1]} {selectedYear}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Budgets will be copied to this period
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="copyFromMonth" className="text-xs sm:text-sm font-medium">
                      Copy From Month
                    </Label>
                    <Select
                      value={copyFromMonth}
                      onValueChange={setCopyFromMonth}
                      required
                    >
                      <SelectTrigger className="text-sm h-10 sm:h-10">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="copyFromYear" className="text-xs sm:text-sm font-medium">
                      Copy From Year
                    </Label>
                    <Select
                      value={copyFromYear}
                      onValueChange={setCopyFromYear}
                      required
                    >
                      <SelectTrigger className="text-sm h-10 sm:h-10">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(
                          (year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {copyFromMonth && copyFromYear && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-green-800">
                        <strong>Selected:</strong> {MONTHS[parseInt(copyFromMonth) - 1]} {copyFromYear}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        All budgets from this period will be copied
                      </p>
                    </div>
                  )}

                  {/* Extra padding for mobile keyboard */}
                  <div className="h-4 sm:hidden" />
                </div>

                <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-50 flex-shrink-0">
                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-10 text-sm font-medium"
                    disabled={copying || !copyFromMonth || !copyFromYear}
                  >
                    {copying ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Copying...
                      </>
                    ) : (
                      'Copy Budget'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCopyDialogOpen(false);
                      resetCopyForm();
                    }}
                    className="w-full sm:w-auto h-10 sm:h-10 text-sm font-medium"
                    disabled={copying}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Budget Dialog */}
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
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[100vw] h-[100dvh] sm:w-[95vw] sm:h-auto sm:max-w-[500px] p-0 flex flex-col sm:max-h-[90vh] sm:rounded-lg rounded-none">
              <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
                <DialogTitle className="text-lg sm:text-xl">
                  {editingBudget ? 'Edit Budget' : 'Add New Budget'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {editingBudget
                    ? 'Update the budget for this category.'
                    : 'Create a new budget to control your expenses.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-3 sm:space-y-4 overscroll-contain">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="category" className="text-xs sm:text-sm font-medium">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                      disabled={!!editingBudget}
                    >
                      <SelectTrigger className="text-sm h-10 sm:h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="amount" className="text-xs sm:text-sm font-medium">Budget Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="1000"
                      inputMode="decimal"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="1000000"
                      required
                      className="text-sm h-10 sm:h-10"
                      autoComplete="off"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="month" className="text-xs sm:text-sm font-medium">Month</Label>
                      <Select
                        value={formData.month}
                        onValueChange={(value) =>
                          setFormData({ ...formData, month: value })
                        }
                      >
                        <SelectTrigger className="text-sm h-10 sm:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, index) => (
                            <SelectItem key={index} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="year" className="text-xs sm:text-sm font-medium">Year</Label>
                      <Select
                        value={formData.year}
                        onValueChange={(value) =>
                          setFormData({ ...formData, year: value })
                        }
                      >
                        <SelectTrigger className="text-sm h-10 sm:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(
                            (year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Extra padding for mobile keyboard */}
                  <div className="h-4 sm:hidden" />
                </div>

                <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-50 flex-shrink-0">
                  <Button type="submit" className="w-full h-10 sm:h-10 text-sm font-medium">
                    {editingBudget ? 'Update' : 'Add'} Budget
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto h-10 sm:h-10 text-sm font-medium"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Label className="text-sm font-medium text-slate-700">Period:</Label>
            <div className="flex gap-3 w-full sm:w-auto">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-40 text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-32 text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(
                    (year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatCurrency(totalBudget, userCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {formatCurrency(totalSpent, userCurrency)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% of total budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
            >
              {formatCurrency(totalRemaining, userCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        {budgets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-sm sm:text-base">
                No budgets found for {MONTHS[selectedMonth - 1]} {selectedYear}.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Add your first budget to start managing your expenses!
              </p>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => (
            <Card key={budget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${budget.percentage >= 100
                          ? 'bg-red-100'
                          : budget.percentage >= 80
                            ? 'bg-orange-100'
                            : 'bg-green-100'
                        }`}
                    >
                      {budget.percentage >= 100 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                        {budget.category?.name || 'Unknown'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Budget: {formatCurrency(budget.amount, userCurrency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      title="Are you sure?"
                      description="This action will permanently remove the selected data from the system. Please confirm to continue."
                      onConfirm={() => handleDelete(budget.id)}
                      confirmText="Delete"
                      isDestructive={true}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-600">
                      Spent: {formatCurrency(budget.spent, userCurrency)}
                    </span>
                    <span className={`font-medium ${getStatusColor(budget.percentage)}`}>
                      {budget.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={budget.percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Remaining: {formatCurrency(budget.remaining, userCurrency)}</span>
                    {budget.percentage >= 100 && (
                      <span className="text-red-600 font-medium">
                        Over by {formatCurrency(Math.abs(budget.remaining), userCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}