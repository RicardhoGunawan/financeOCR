'use client';

import { useEffect, useState } from 'react';
import { supabase, Insight } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatting';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


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

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return AlertTriangle;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle2;
    default:
      return Info;
  }
};

export default function InsightsPage() {
  const { user, profile } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
      toast.error('Failed to load insights');
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

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      const unreadIds = insights.filter((i) => !i.is_read).map((i) => i.id);

      if (unreadIds.length === 0) {
        toast.info('All insights are already read');
        return;
      }

      const { error } = await supabase
        .from('insights')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setInsights((prev) =>
        prev.map((insight) => ({ ...insight, is_read: true }))
      );

      toast.success(`Marked ${unreadIds.length} insights as read`);
    } catch (error) {
      console.error('Error marking all insights as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const generateNewInsights = async () => {
    try {
      setGenerating(true);
      toast.info('Analyzing your financial data...');

      // Call edge function via Supabase client (automatically handles auth & CORS)
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { user_id: user?.id },
      });

      if (error) throw error;

      toast.success('New insights generated successfully!');
      await loadInsights();
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast.error(error.message || 'Failed to generate new insights');
    } finally {
      setGenerating(false);
    }
  };

  const groupedInsights = insights.reduce((acc, insight) => {
    const date = new Date(insight.created_at).toLocaleDateString('en-US', {
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Financial Insights
            </h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-emerald-600">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            AI-powered personalized financial insights
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              variant="outline"
              className="gap-2"
            >
              {markingAllRead ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark All as Read
                </>
              )}
            </Button>
          )}
          <Button
            onClick={generateNewInsights}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                About Financial Insights
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 mt-1">
                Our AI analyzes your spending patterns and provides personalized
                recommendations to help you achieve your financial goals. Insights
                are automatically updated weekly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {/* Insights List */}
      {insights.length === 0 ? (
        // Bagian ini tetap sama
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Insights Yet
            </h3>
            <p className="text-slate-600 mb-4">
              Click the "Generate Insights" button to get your first AI analysis
            </p>
            <Button onClick={generateNewInsights} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        // --- STRUKTUR AKORDEON BARU PER-INSIGHT ---
        <Accordion type="single" collapsible className="w-full space-y-3">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.insight_type);
            const SeverityIcon = getSeverityIcon(insight.severity);

            return (
              <AccordionItem
                key={insight.id}
                value={String(insight.id)}
                className={`border rounded-lg bg-white overflow-hidden transition-all ${!insight.is_read ? 'border-l-4 border-l-emerald-500' : ''
                  }`}
              >
                {/* === RINGKASAN INSIGHT === */}
                <AccordionTrigger
                  className="p-3 sm:p-4 hover:no-underline"
                  onClick={() => !insight.is_read && markAsRead(insight.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full text-left">
                    {/* ICON SEVERITY */}
                    <div
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 ${getSeverityColor(
                        insight.severity
                      )}`}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    {/* TITLE DAN TANGGAL */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                        {insight.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(insight.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* BADGE SEVERITY (TETAP DALAM BENTUK BADGE) */}
                    <Badge
                      variant="outline"
                      className={`mt-2 sm:mt-0 sm:ml-auto flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 ${getSeverityColor(
                        insight.severity
                      )}`}
                    >
                      <SeverityIcon className="h-3 w-3" />
                      <span className="capitalize">{insight.severity}</span>
                    </Badge>
                  </div>
                </AccordionTrigger>

                {/* === DETAIL INSIGHT === */}
                <AccordionContent>
                  <div className="border-t p-3 sm:p-4 pt-3 space-y-3">
                    <p className="text-sm text-slate-700">{insight.description}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {/* TIPE INSIGHT DALAM BADGE */}
                      <Badge
                        variant="secondary"
                        className="capitalize text-[10px] sm:text-xs px-2 py-0.5"
                      >
                        {insight.insight_type}
                      </Badge>

                      {/* PERIODE DALAM BADGE JUGA */}
                      <Badge
                        variant="outline"
                        className="text-[10px] sm:text-xs px-2 py-0.5"
                      >
                        Periode:{' '}
                        {new Date(insight.period_start).toLocaleDateString('id-ID')} -{' '}
                        {new Date(insight.period_end).toLocaleDateString('id-ID')}
                      </Badge>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}