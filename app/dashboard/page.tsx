// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase, Transaction, BudgetWithSpent, Insight } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useRouter } from 'next/navigation';
import { FinanceChatbot } from '@/components/finance-chatbot';

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50';
    case 'warning':
      return 'border-orange-200 bg-orange-50';
    case 'success':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
};

type TransactionWithWallet = Transaction & {
  wallet?: {
    name: string;
    color: string;
  };
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
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithWallet[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetWithSpent[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletStats, setWalletStats] = useState({
    total: 0,
    count: 0,
    activeCount: 0,
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadBudgetAlerts();
      loadInsights();
      loadWalletStats();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, wallet:wallets(name, color), category:categories(name)')
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

      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (!budgetsData || budgetsData.length === 0) return;

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

      const alerts = budgetsWithSpent.filter((b) => b.percentage >= 80);
      setBudgetAlerts(alerts);
    } catch (error) {
      console.error('Error loading budget alerts:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const loadWalletStats = async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance, is_active')
      .eq('user_id', user?.id);

    if (data) {
      const activeWallets = data.filter((w) => w.is_active);
      setWalletStats({
        total: activeWallets.reduce((sum, w) => sum + Number(w.balance), 0),
        count: data.length,
        activeCount: activeWallets.length,
      });
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
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Welcome back! Here's a summary of your finances.
          </p>
        </div>

        {/* AI Insights Preview */}
        {insights.length > 0 && (
          <Card className="mb-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-emerald-900 text-base sm:text-lg">
                  <Sparkles className="h-5 w-5" />
                  AI Insights for You
                  <Badge variant="default" className="bg-emerald-600 ml-2">
                    {insights.length} New
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard/insights')}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-lg p-3 border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(
                    insight.severity
                  )}`}
                  onClick={() => router.push('/dashboard/insights')}
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1">
                        {insight.title}
                      </h3>
                      <p className="text-xs text-slate-700 line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-900 text-base sm:text-lg">
                <AlertTriangle className="h-5 w-5" />
                Budget Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {budgetAlerts.map((budget) => (
                <div key={budget.id} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900 text-sm sm:text-base">
                      {budget.category?.name}
                    </span>
                    <span
                      className={`text-sm font-semibold ${budget.percentage >= 100 ? 'text-red-600' : 'text-orange-600'
                        }`}
                    >
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(budget.percentage, 100)} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="truncate mr-2">
                      {formatRupiah(budget.spent)} / {formatRupiah(budget.amount)}
                    </span>
                    {budget.percentage >= 100 ? (
                      <span className="text-red-600 font-medium flex-shrink-0">Over budget!</span>
                    ) : (
                      <span className="text-orange-600 flex-shrink-0">Approaching limit</span>
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
              <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold truncate">
                {formatRupiah(walletStats.total)}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {walletStats.activeCount} active wallets
              </p>
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
              <p className="text-xs text-slate-600 mt-1">All transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-600 truncate">
                {formatRupiah(stats.totalExpense)}
              </div>
              <p className="text-xs text-slate-600 mt-1">All transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.transactionCount}</div>
              <p className="text-xs text-slate-600 mt-1">Total recorded</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-slate-600 text-center py-8 text-sm sm:text-base">
                No transactions yet. Start by adding a transaction or uploading a receipt!
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {recentTransactions.map((transaction) => (
                  <AccordionItem
                    key={transaction.id}
                    value={String(transaction.id)}
                    className="border-b last:border-b-0"
                  >
                    {/* === TRIGGER === */}
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 sm:gap-3">
                        {/* Kiri: Icon + Title + Date */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div
                            className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                              }`}
                          >
                            {transaction.type === 'income' ? (
                              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                              {transaction.title}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-600">
                              {new Date(transaction.date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Kanan: Nominal */}
                        <div
                          className={`text-sm sm:text-base font-semibold flex-shrink-0 pr-2 text-right ${transaction.type === 'income'
                              ? 'text-green-600'
                              : 'text-red-600'
                            }`}
                        >
                          <span>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatRupiah(Number(transaction.amount))}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>

                    {/* === CONTENT === */}
                    <AccordionContent>
                      <div className="pt-2 pb-3 pl-10 sm:pl-14 space-y-3 text-sm text-slate-800">
                        {/* Wallet */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium w-20 flex-shrink-0 text-xs sm:text-sm">
                            Wallet
                          </span>
                          {transaction.wallet ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs gap-1 px-2 py-1"
                              style={{ borderColor: transaction.wallet.color }}
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: transaction.wallet.color }}
                              />
                              {transaction.wallet.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 italic text-xs">
                              Not assigned
                            </span>
                          )}
                        </div>

                        {/* Category */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium w-20 flex-shrink-0 text-xs sm:text-sm">
                            Category
                          </span>
                          {transaction.category?.name ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] sm:text-xs px-2 py-1"
                            >
                              {transaction.category.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 italic text-xs">
                              Uncategorized
                            </span>
                          )}
                        </div>

                        {/* Note */}
                        {transaction.note && (
                          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="font-medium w-20 flex-shrink-0 text-xs sm:text-sm">
                              Note
                            </span>
                            <p className="text-slate-600 text-xs sm:text-sm mt-0.5 sm:mt-0">
                              {transaction.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finance Chatbot Widget */}
      <FinanceChatbot />
    </>
  );
}