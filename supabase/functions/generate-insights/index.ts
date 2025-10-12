// supabase/functions/generate-insights/index.ts
// Complete version with CORS fix

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// CORS headers - IMPORTANT for frontend calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get request body - support specific user or all users
    const body = await req.json().catch(() => ({}));
    const specificUserId = body.user_id;

    let userIds: string[] = [];

    if (specificUserId) {
      // Manual trigger from frontend - process specific user
      userIds = [specificUserId];
      console.log(`Processing insights for user: ${specificUserId}`);
    } else {
      // Cron job - process all users
      const { data: users, error: usersError } = await supabase
        .from("transactions")
        .select("user_id")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      userIds = [...new Set(users?.map((u) => u.user_id) || [])];
      console.log(`Processing insights for ${userIds.length} users`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        await generateInsightsForUser(userId, supabase);
        successCount++;
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Insights generated for ${successCount} users, ${errorCount} errors`,
        processed: successCount,
        errors: errorCount,
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders // Add CORS headers
        } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders // Add CORS headers
        } 
      }
    );
  }
});

async function generateInsightsForUser(userId: string, supabase: any) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - 30);

  const [currentTransactions, previousTransactions, budgets, categories] =
    await Promise.all([
      fetchTransactions(supabase, userId, startDate, endDate),
      fetchTransactions(supabase, userId, prevStartDate, prevEndDate),
      fetchBudgets(supabase, userId),
      fetchCategories(supabase, userId),
    ]);

  const analysisData = {
    current_period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      transactions: currentTransactions,
      total_income: calculateTotal(currentTransactions, "income"),
      total_expense: calculateTotal(currentTransactions, "expense"),
      by_category: groupByCategory(currentTransactions, categories),
    },
    previous_period: {
      start: prevStartDate.toISOString().split("T")[0],
      end: prevEndDate.toISOString().split("T")[0],
      total_income: calculateTotal(previousTransactions, "income"),
      total_expense: calculateTotal(previousTransactions, "expense"),
      by_category: groupByCategory(previousTransactions, categories),
    },
    budgets: budgets,
    categories: categories,
  };

  const insights = await generateInsightsWithGemini(analysisData);
  await saveInsights(supabase, userId, insights, startDate, endDate);
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0]);

  if (error) throw error;
  return data || [];
}

async function fetchBudgets(supabase: any, userId: string) {
  const currentDate = new Date();
  const { data, error } = await supabase
    .from("budgets")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .eq("month", currentDate.getMonth() + 1)
    .eq("year", currentDate.getFullYear());

  if (error) throw error;
  return data || [];
}

async function fetchCategories(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

function calculateTotal(transactions: any[], type: string) {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function groupByCategory(transactions: any[], categories: any[]) {
  const grouped: Record<string, any> = {};

  transactions.forEach((t) => {
    const categoryName = t.category?.name || "Uncategorized";
    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        category: categoryName,
        type: t.type,
        total: 0,
        count: 0,
      };
    }
    grouped[categoryName].total += Number(t.amount);
    grouped[categoryName].count += 1;
  });

  return Object.values(grouped);
}

async function generateInsightsWithGemini(data: any) {
  // Add more detailed logging
  console.log('=== Starting Gemini Analysis ===');
  console.log('Transaction count:', data.current_period.transactions.length);
  console.log('Current expense:', data.current_period.total_expense);
  console.log('Previous expense:', data.previous_period.total_expense);

  const prompt = `Kamu adalah seorang penasihat keuangan profesional. Analisis data transaksi berikut dan berikan 3-5 wawasan keuangan yang ACTIONABLE dan SPESIFIK dalam Bahasa Indonesia.

Data Keuangan:
${JSON.stringify(data, null, 2)}

Instruksi:
1. Bandingkan periode saat ini dengan periode sebelumnya
2. Identifikasi tren pengeluaran (naik/turun)
3. Cek apakah ada kategori yang mendekati atau melebihi budget
4. Cari pola pengeluaran yang tidak biasa
5. Berikan rekomendasi konkret

Format output dalam JSON array dengan struktur:
[
  {
    "title": "Judul singkat (max 60 karakter)",
    "description": "Penjelasan detail dengan angka spesifik (max 200 karakter)",
    "type": "spending|saving|budget|trend|subscription|general",
    "severity": "info|warning|success|critical",
    "metadata": {
      "category": "nama kategori jika relevan",
      "amount_change": angka perubahan jika ada,
      "percentage_change": persentase perubahan
    }
  }
]

Contoh insight yang BAIK:
- "Pengeluaran Makan naik 35% bulan ini menjadi Rp 2.500.000"
- "Budget Transportasi hampir habis, tersisa 15% (Rp 150.000)"
- "Anda berhasil hemat 20% di kategori Belanja bulan ini"

Berikan HANYA JSON array, tanpa teks tambahan.`;

  try {
    console.log('Calling Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Gemini API Response:', JSON.stringify(result, null, 2));

    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    console.log('Generated Text:', generatedText);

    // Try to extract JSON from response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error("Failed to extract JSON from Gemini response");
      console.error("Full response text:", generatedText);
      
      // Generate fallback insights based on data
      return generateFallbackInsights(data);
    }

    const insights = JSON.parse(jsonMatch[0]);
    console.log(`Successfully parsed ${insights.length} insights`);
    
    return insights;
  } catch (error) {
    console.error('Error in generateInsightsWithGemini:', error);
    // Return fallback insights on error
    return generateFallbackInsights(data);
  }
}

// Fallback insights generator (doesn't rely on AI)
function generateFallbackInsights(data: any): any[] {
  const insights: any[] = [];
  
  // Compare current vs previous period
  const currentExpense = data.current_period.total_expense;
  const previousExpense = data.previous_period.total_expense;
  const expenseChange = currentExpense - previousExpense;
  const expenseChangePercent = previousExpense > 0 
    ? ((expenseChange / previousExpense) * 100).toFixed(1)
    : 0;

  // Insight 1: Expense trend
  if (Math.abs(expenseChange) > 0) {
    insights.push({
      title: expenseChange > 0 
        ? `Pengeluaran Naik ${expenseChangePercent}%`
        : `Pengeluaran Turun ${Math.abs(Number(expenseChangePercent))}%`,
      description: expenseChange > 0
        ? `Total pengeluaran bulan ini Rp ${currentExpense.toLocaleString('id-ID')}, naik Rp ${expenseChange.toLocaleString('id-ID')} dari bulan lalu.`
        : `Selamat! Anda berhasil hemat Rp ${Math.abs(expenseChange).toLocaleString('id-ID')} bulan ini.`,
      type: expenseChange > 0 ? 'spending' : 'saving',
      severity: expenseChange > 0 ? 'warning' : 'success',
      metadata: {
        amount_change: expenseChange,
        percentage_change: Number(expenseChangePercent),
      },
    });
  }

  // Insight 2: Budget alerts
  if (data.budgets && data.budgets.length > 0) {
    data.budgets.forEach((budget: any) => {
      const spent = data.current_period.by_category.find(
        (cat: any) => cat.category === budget.category?.name
      )?.total || 0;
      
      const percentage = (spent / budget.amount) * 100;
      
      if (percentage >= 80) {
        insights.push({
          title: `Budget ${budget.category?.name} ${percentage >= 100 ? 'Terlewati' : 'Hampir Habis'}`,
          description: `${budget.category?.name}: Rp ${spent.toLocaleString('id-ID')} dari Rp ${budget.amount.toLocaleString('id-ID')} (${percentage.toFixed(0)}%)`,
          type: 'budget',
          severity: percentage >= 100 ? 'critical' : 'warning',
          metadata: {
            category: budget.category?.name,
            spent: spent,
            budget: budget.amount,
            percentage: percentage,
          },
        });
      }
    });
  }

  // Insight 3: Top spending category
  if (data.current_period.by_category.length > 0) {
    const topCategory = data.current_period.by_category
      .filter((cat: any) => cat.type === 'expense')
      .sort((a: any, b: any) => b.total - a.total)[0];
    
    if (topCategory) {
      insights.push({
        title: `Pengeluaran Terbesar: ${topCategory.category}`,
        description: `${topCategory.category} adalah pengeluaran terbesar dengan total Rp ${topCategory.total.toLocaleString('id-ID')} dari ${topCategory.count} transaksi.`,
        type: 'trend',
        severity: 'info',
        metadata: {
          category: topCategory.category,
          amount: topCategory.total,
          count: topCategory.count,
        },
      });
    }
  }

  // Insight 4: Transaction count
  const txCount = data.current_period.transactions.length;
  if (txCount > 0) {
    insights.push({
      title: `${txCount} Transaksi Bulan Ini`,
      description: `Anda mencatat ${txCount} transaksi dengan total pengeluaran Rp ${currentExpense.toLocaleString('id-ID')}.`,
      type: 'general',
      severity: 'info',
      metadata: {
        transaction_count: txCount,
        total_expense: currentExpense,
      },
    });
  }

  console.log(`Generated ${insights.length} fallback insights`);
  return insights;
}

async function saveInsights(
  supabase: any,
  userId: string,
  insights: any[],
  startDate: Date,
  endDate: Date
) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await supabase
    .from("insights")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", thirtyDaysAgo.toISOString());

  const insightsToInsert = insights.map((insight) => ({
    user_id: userId,
    title: insight.title,
    description: insight.description,
    insight_type: insight.type,
    severity: insight.severity,
    period_start: startDate.toISOString().split("T")[0],
    period_end: endDate.toISOString().split("T")[0],
    metadata: insight.metadata || {},
    is_read: false,
  }));

  const { error } = await supabase.from("insights").insert(insightsToInsert);

  if (error) throw error;

  console.log(`Saved ${insightsToInsert.length} insights for user ${userId}`);
}