'use client';

import { useEffect, useState } from 'react';
import { supabase, Transaction, BudgetWithSpent } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadBudgetAlerts();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(5);

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id);

      if (allTransactions) {
        const income = allTransactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = allTransactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        setStats({
          totalIncome: income,
          totalExpense: expense,
          balance: income - expense,
          transactionCount: allTransactions.length,
        });
      }

      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetAlerts = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Load budgets for current month
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (!budgetsData || budgetsData.length === 0) return;

      // Calculate spent for each budget
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        budgetsData.map(async (budget) => {
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

          return {
            ...budget,
            spent,
            percentage,
            remaining: budget.amount - spent,
          };
        })
      );

      // Filter budgets that are over 80% or exceeded
      const alerts = budgetsWithSpent.filter(b => b.percentage >= 80);
      setBudgetAlerts(alerts);
    } catch (error) {
      console.error('Error loading budget alerts:', error);
    }
  };

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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Welcome back! Here's your financial summary.
        </p>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-900 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Budget Warning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetAlerts.map((budget) => (
              <div key={budget.id} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 text-sm sm:text-base">
                    {budget.category?.name}
                  </span>
                  <span className={`text-sm font-semibold ${budget.percentage >= 100 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                    {budget.percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(budget.percentage, 100)}
                  className="h-2 mb-2"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="truncate mr-2">
                    {formatRupiah(budget.spent)} / {formatRupiah(budget.amount)}
                  </span>
                  {budget.percentage >= 100 ? (
                    <span className="text-red-600 font-medium flex-shrink-0">
                      Over budget!
                    </span>
                  ) : (
                    <span className="text-orange-600 flex-shrink-0">
                      Approaching the limit
                    </span>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push('/dashboard/budgets')}
            >
              View All Budgets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate">
              {formatRupiah(stats.balance)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Current balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
              {formatRupiah(stats.totalIncome)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Total income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600 truncate">
              {formatRupiah(stats.totalExpense)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Total expenditure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.transactionCount}
            </div>
            <p className="text-xs text-slate-600 mt-1">Total Transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Latest Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-slate-600 text-center py-8 text-sm sm:text-base">
              There are no transactions yet. Start by adding a transaction or uploading a receipt! There are no transactions yet. Start by adding a transaction or uploading a receipt!
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0 last:pb-0 gap-3"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${transaction.type === 'income'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                        }`}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                        {transaction.title}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600">
                        {new Date(transaction.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm sm:text-lg font-semibold flex-shrink-0 ${transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                      }`}
                  >
                    <span className="hidden sm:inline">
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatRupiah(Number(transaction.amount)).replace('Rp', 'Rp ')}
                    </span>
                    <span className="sm:hidden">
                      {transaction.type === 'income' ? '+' : '-'}
                      {(Number(transaction.amount) / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}