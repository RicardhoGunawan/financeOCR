// supabase/functions/generate-insights/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface TransactionData {
  user_id: string;
  transactions: any[];
  budgets: any[];
  categories: any[];
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all users who have transactions
    const { data: users, error: usersError } = await supabase
      .from("transactions")
      .select("user_id")
      .order("created_at", { ascending: false });

    if (usersError) throw usersError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users?.map((u) => u.user_id) || [])];

    console.log(`Processing insights for ${uniqueUserIds.length} users`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userId of uniqueUserIds) {
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
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function generateInsightsForUser(userId: string, supabase: any) {
  // Calculate date ranges
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - 30); // Previous 30 days

  // Fetch user data
  const [currentTransactions, previousTransactions, budgets, categories] =
    await Promise.all([
      fetchTransactions(supabase, userId, startDate, endDate),
      fetchTransactions(supabase, userId, prevStartDate, prevEndDate),
      fetchBudgets(supabase, userId),
      fetchCategories(supabase, userId),
    ]);

  // Prepare data for AI
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

  // Generate insights using Gemini
  const insights = await generateInsightsWithGemini(analysisData);

  // Save insights to database
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

  const result = await response.json();
  const generatedText =
    result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // Parse JSON from response
  const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from Gemini response");
    return [];
  }

  return JSON.parse(jsonMatch[0]);
}

async function saveInsights(
  supabase: any,
  userId: string,
  insights: any[],
  startDate: Date,
  endDate: Date
) {
  // Delete old insights for this user (keep only last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await supabase
    .from("insights")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", thirtyDaysAgo.toISOString());

  // Insert new insights
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