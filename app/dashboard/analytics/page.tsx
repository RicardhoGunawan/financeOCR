'use client';

import { useEffect, useState } from 'react';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

type MonthlyData = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type CategoryData = {
  name: string;
  value: number;
};

type WalletData = {
  name: string;
  value: number;
  color: string;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<{
    income: CategoryData[];
    expense: CategoryData[];
  }>({
    income: [],
    expense: [],
  });
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    avgIncome: 0,
    avgExpense: 0,
    highestExpense: 0,
    highestIncome: 0,
    walletBalance: 0,
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
      loadWalletData();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    try {
      const months = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      setTransactions(data || []);
      processMonthlyData(data || []);
      processCategoryData(data || []);
      calculateSummary(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('name, balance, color, is_active')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('balance', { ascending: false });

      if (error) throw error;

      const walletChartData = (data || []).map((wallet) => ({
        name: wallet.name,
        value: Number(wallet.balance),
        color: wallet.color || '#10b981',
      }));

      setWalletData(walletChartData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const processMonthlyData = (transactions: Transaction[]) => {
    const monthMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { income: 0, expense: 0 });
      }

      const data = monthMap.get(monthKey)!;
      if (transaction.type === 'income') {
        data.income += Number(transaction.amount);
      } else {
        data.expense += Number(transaction.amount);
      }
    });

    const sortedData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month).toLocaleDateString('id-ID', {
          month: 'short',
          year: '2-digit',
        }),
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }));

    setMonthlyData(sortedData);
  };

  const processCategoryData = (transactions: Transaction[]) => {
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || 'Uncategorized';
      const map = transaction.type === 'income' ? incomeMap : expenseMap;
      map.set(categoryName, (map.get(categoryName) || 0) + Number(transaction.amount));
    });

    setCategoryData({
      income: Array.from(incomeMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
      expense: Array.from(expenseMap.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    });
  };

  const calculateSummary = async (transactions: Transaction[]) => {
    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');

    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    // Get total wallet balance
    const { data: wallets } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user?.id)
      .eq('is_active', true);

    const walletBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;

    setSummary({
      totalIncome,
      totalExpense,
      avgIncome: income.length > 0 ? totalIncome / income.length : 0,
      avgExpense: expenses.length > 0 ? totalExpense / expenses.length : 0,
      highestIncome: income.length > 0 ? Math.max(...income.map((t) => Number(t.amount))) : 0,
      highestExpense: expenses.length > 0 ? Math.max(...expenses.map((t) => Number(t.amount))) : 0,
      walletBalance,
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 sm:p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900 mb-1 sm:mb-2 text-xs sm:text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-xs sm:text-sm">
              {entry.name}: {formatRupiah(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Financial Analysis</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Visualize your financial patterns and trends across all wallets
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 truncate">
              {formatRupiah(summary.walletBalance)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Current total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
              {formatRupiah(summary.avgIncome)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600 truncate">
              {formatRupiah(summary.avgExpense)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold truncate ${
                summary.totalIncome - summary.totalExpense >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatRupiah(summary.totalIncome - summary.totalExpense)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Total balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Monthly Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Expense"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Monthly Net Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="net" fill="#3b82f6" name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Distribution & Category Charts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Wallet Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {walletData.length === 0 ? (
              <p className="text-slate-600 text-center py-12 text-sm">No wallet data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={walletData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {walletData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatRupiah(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.expense.length === 0 ? (
              <p className="text-slate-600 text-center py-12 text-sm">No expense data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData.expense}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.expense.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatRupiah(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Income by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.income.length === 0 ? (
            <p className="text-slate-600 text-center py-12 text-sm">No income data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData.income}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={window.innerWidth < 640 ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.income.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatRupiah(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}