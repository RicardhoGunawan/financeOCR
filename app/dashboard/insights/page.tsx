'use client';

import { useEffect, useState } from 'react';
import { supabase, Insight } from '@/lib/supabase'; // Asumsikan path ini benar
import { useAuth } from '@/lib/auth-context'; // Asumsikan path ini benar
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function untuk format mata uang
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function untuk ikon berdasarkan tipe insight
const getInsightIcon = (type: string) => {
  switch (type) {
    case 'spending':
      return TrendingDown;
    case 'saving':
      return TrendingUp;
    case 'budget':
      return AlertTriangle;
    case 'trend':
      return Sparkles;
    case 'subscription':
      return RefreshCw;
    default:
      return Lightbulb;
  }
};

// Helper function untuk warna berdasarkan tingkat severity
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

// Helper function untuk ikon berdasarkan tingkat severity
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle2;
    default:
      return Info;
  }
};

export default function InsightsPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
      toast.error('Gagal memuat insights');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (insightId: number) => {
    try {
      const { error } = await supabase
        .from('insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;

      setInsights((prev) =>
        prev.map((insight) =>
          insight.id === insightId ? { ...insight, is_read: true } : insight
        )
      );
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const generateNewInsights = async () => {
    try {
      setGenerating(true);
      toast.info('Sedang menganalisis data keuangan Anda...');

      // Memanggil edge function untuk menghasilkan insights
      // Pastikan RLS di tabel insights mengizinkan Service Role untuk INSERT
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        method: 'POST', // Pastikan method sesuai dengan yang diharapkan function
      });

      if (error) throw new Error(error.message);

      toast.success('Insights baru berhasil dibuat!');
      await loadInsights(); // Muat ulang insights setelah berhasil
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast.error(`Gagal membuat insights baru: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Mengelompokkan insights berdasarkan tanggal
  const groupedInsights = insights.reduce((acc, insight) => {
    const date = new Date(insight.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  const unreadCount = insights.filter((i) => !i.is_read).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Financial Insights
            </h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                {unreadCount} Baru
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Wawasan keuangan yang dipersonalisasi oleh AI
          </p>
        </div>
        <Button
          onClick={generateNewInsights}
          disabled={generating}
          className="gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
        >
          {generating ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Menganalisis...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                Tentang Financial Insights
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 mt-1">
                AI kami menganalisis pola pengeluaran Anda dan memberikan rekomendasi
                yang dipersonalisasi untuk membantu Anda mencapai tujuan keuangan.
                Insights diperbarui secara otomatis setiap minggu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Insights */}
      {insights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Belum Ada Insights
            </h3>
            <p className="text-slate-600 mb-4 max-w-xs mx-auto">
              Klik tombol "Generate Insights" untuk mendapatkan analisis AI pertama Anda.
            </p>
            <Button onClick={generateNewInsights} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Sekarang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedInsights).map(([date, dateInsights]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 px-1">{date}</h2>
              <div className="space-y-3">
                {dateInsights.map((insight) => {
                  const Icon = getInsightIcon(insight.insight_type);
                  const SeverityIcon = getSeverityIcon(insight.severity);

                  return (
                    <Card
                      key={insight.id}
                      className={`transition-all hover:shadow-md ${
                        !insight.is_read ? 'border-l-4 border-l-emerald-600 bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div
                            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 ${getSeverityColor(
                              insight.severity
                            )}`}
                          >
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                              <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight">
                                {insight.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`flex-shrink-0 text-xs capitalize ${getSeverityColor(
                                  insight.severity
                                )}`}
                              >
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {insight.severity}
                              </Badge>
                            </div>

                            <p className="text-sm text-slate-700 mb-3">
                              {insight.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                              <Badge variant="secondary" className="capitalize">
                                {insight.insight_type}
                              </Badge>
                              <span>•</span>
                              <span>
                                Periode: {new Date(insight.period_start).toLocaleDateString('id-ID')} -{' '}
                                {new Date(insight.period_end).toLocaleDateString('id-ID')}
                              </span>
                            </div>

                            {!insight.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-3 text-xs h-auto px-2 py-1 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                onClick={() => markAsRead(insight.id)}
                              >
                                Tandai Sudah Dibaca
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}