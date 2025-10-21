// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency } from '@/lib/formatting';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueryFilter {
    type?: 'income' | 'expense';
    category_name?: string;
    amount_min?: number;
    amount_max?: number;
    date_start?: string;
    date_end?: string;
}



// Simplified date range
function getDateRange(question: string): { start: string; end: string } {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (question.includes('hari ini')) {
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }

    if (question.includes('kemarin')) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
    }

    if (question.includes('minggu ini')) {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        return { start: firstDay.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }

    if (question.includes('minggu lalu')) {
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return { start: lastWeekStart.toISOString().split('T')[0], end: lastWeekEnd.toISOString().split('T')[0] };
    }

    if (question.includes('bulan ini')) {
        const firstDay = new Date(currentYear, currentMonth, 1);
        return { start: firstDay.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }

    if (question.includes('bulan lalu')) {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
    }

    if (question.includes('tahun ini')) {
        const firstDay = new Date(currentYear, 0, 1);
        return { start: firstDay.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }

    // Default: bulan ini
    const firstDay = new Date(currentYear, currentMonth, 1);
    return { start: firstDay.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
}

function parseUserQuery(userQuestion: string): QueryFilter {
    const lowerQ = userQuestion.toLowerCase();
    const { start, end } = getDateRange(lowerQ);

    const queryFilters: QueryFilter = {
        date_start: start,
        date_end: end,
    };

    // Detect type
    const expenseWords = ['pengeluaran', 'expense', 'keluar', 'bayar', 'beli', 'belanja', 'boros'];
    const incomeWords = ['pemasukan', 'income', 'masuk', 'gaji', 'terima', 'pendapatan'];

    if (expenseWords.some(w => lowerQ.includes(w))) {
        queryFilters.type = 'expense';
    } else if (incomeWords.some(w => lowerQ.includes(w))) {
        queryFilters.type = 'income';
    }

    // Detect amount
    const amountMatch = lowerQ.match(/(\d+)\s*(juta|ribu|rb|k)?/);
    if (amountMatch) {
        let amount = parseInt(amountMatch[1]);
        if (lowerQ.includes('juta')) amount *= 1000000;
        else if (lowerQ.includes('ribu') || lowerQ.includes('rb') || lowerQ.includes('k')) amount *= 1000;

        if (['di atas', 'lebih dari', 'minimal', 'min'].some(w => lowerQ.includes(w))) {
            queryFilters.amount_min = amount;
        } else if (['di bawah', 'kurang dari', 'maksimal', 'max'].some(w => lowerQ.includes(w))) {
            queryFilters.amount_max = amount;
        }
    }

    return queryFilters;
}

async function fetchTransactions(userId: string, filters: QueryFilter) {
    try {
        let query = supabase
            .from('transactions')
            .select('id, title, amount, type, date, note, category_id, wallet_id')
            .eq('user_id', userId);

        if (filters.type) query = query.eq('type', filters.type);
        if (filters.date_start) query = query.gte('date', filters.date_start);
        if (filters.date_end) query = query.lte('date', filters.date_end);
        if (filters.amount_min) query = query.gte('amount', filters.amount_min);
        if (filters.amount_max) query = query.lte('amount', filters.amount_max);

        const { data: transactions, error } = await query.order('date', { ascending: false }).limit(500);

        if (error || !transactions) return [];

        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', userId);
        const { data: wallets } = await supabase.from('wallets').select('id, name, type').eq('user_id', userId);

        return transactions.map((t) => ({
            ...t,
            category: categories?.find((c) => c.id === t.category_id) || null,
            wallet: wallets?.find((w) => w.id === t.wallet_id) || null,
        }));
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

// ============================================
// SMART INTENT DETECTION & DIRECT ANSWERS
// ============================================

type Intent = 'total' | 'top_category' | 'average' | 'count' | 'biggest' | 'smallest' | 'list' | 'comparison' | 'advice' | 'complex';

function detectIntent(question: string): Intent {
    const lowerQ = question.toLowerCase();

    // Simple queries - langsung dijawab tanpa AI
    if (['total', 'jumlah total', 'berapa total'].some(w => lowerQ.includes(w))) return 'total';
    if (['kategori', 'category', 'boros', 'terbanyak', 'terbesar per kategori'].some(w => lowerQ.includes(w))) return 'top_category';
    if (['rata-rata', 'average', 'rerata'].some(w => lowerQ.includes(w))) return 'average';
    if (['berapa banyak', 'jumlah transaksi', 'count'].some(w => lowerQ.includes(w))) return 'count';
    if (['transaksi terbesar', 'pengeluaran terbesar', 'biggest'].some(w => lowerQ.includes(w))) return 'biggest';
    if (['transaksi terkecil', 'pengeluaran terkecil', 'smallest'].some(w => lowerQ.includes(w))) return 'smallest';
    if (['daftar', 'list', 'lihat', 'tampilkan'].some(w => lowerQ.includes(w))) return 'list';

    // Complex queries - butuh AI
    if (['bandingkan', 'compare', 'vs', 'lebih'].some(w => lowerQ.includes(w))) return 'comparison';
    if (['saran', 'tips', 'advice', 'rekomendasi', 'bagaimana', 'gimana'].some(w => lowerQ.includes(w))) return 'advice';

    return 'complex';
}

function generateDirectAnswer(intent: Intent, transactions: any[], filters: QueryFilter, question: string, userCurrency: string): string | null {
    if (transactions.length === 0) {
        return `Tidak ada data transaksi yang ditemukan untuk periode ini. Silakan tambahkan transaksi terlebih dahulu.`;
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    switch (intent) {
        case 'total': {
            if (filters.type === 'expense' || question.includes('pengeluaran')) {
                const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
                return `💰 **Total Pengeluaran**\n\n${formatCurrency(total, userCurrency)}\n\n📊 Dari ${expenses.length} transaksi`;
            } else if (filters.type === 'income' || question.includes('pemasukan')) {
                const total = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
                return `💰 **Total Pemasukan**\n\n${formatCurrency(total, userCurrency)}\n\n📊 Dari ${incomes.length} transaksi`;
            } else {
                const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
                const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
                const netFlow = totalIncome - totalExpense;
                return `💰 **Ringkasan Keuangan**\n\n**Pemasukan:** ${formatCurrency(totalIncome, userCurrency)}\n**Pengeluaran:** ${formatCurrency(totalExpense, userCurrency)}\n**Net Flow:** ${formatCurrency(netFlow, userCurrency)} ${netFlow >= 0 ? '✅' : '⚠️'}`;
            }
        }

        case 'top_category': {
            const targetTransactions = filters.type === 'income' ? incomes : expenses;
            const byCategory = targetTransactions.reduce((acc, t) => {
                const catName = t.category?.name || 'Lainnya';
                acc[catName] = (acc[catName] || 0) + Number(t.amount);
                return acc;
            }, {} as Record<string, number>);

            // BARU
            // BARU (Solusi Tepat)
            const sorted = (Object.entries(byCategory) as [string, number][]).sort(
                (a, b) => b[1] - a[1]
            );
            const top5 = sorted.slice(0, 5);

            if (top5.length === 0) return 'Tidak ada data kategori.';

            const typeLabel = filters.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            let response = `📊 **Top Kategori ${typeLabel}**\n\n`;

            top5.forEach(([cat, amount], i) => {
                const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
                response += `${emoji} **${cat}**\n   ${formatCurrency(amount, userCurrency)}\n\n`;
            });

            return response.trim();
        }

        case 'average': {
            const targetTransactions = filters.type === 'income' ? incomes : (filters.type === 'expense' ? expenses : transactions);
            if (targetTransactions.length === 0) return 'Tidak ada data untuk dihitung rata-rata.';

            const total = targetTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
            const avg = total / targetTransactions.length;
            const typeLabel = filters.type === 'income' ? 'Pemasukan' : (filters.type === 'expense' ? 'Pengeluaran' : 'Transaksi');

            return `📊 **Rata-rata ${typeLabel}**\n\n${formatCurrency(avg, userCurrency)}\n\nDari ${targetTransactions.length} transaksi`;
        }

        case 'count': {
            const targetTransactions = filters.type === 'income' ? incomes : (filters.type === 'expense' ? expenses : transactions);
            const typeLabel = filters.type === 'income' ? 'pemasukan' : (filters.type === 'expense' ? 'pengeluaran' : 'transaksi');
            return `📊 **Jumlah Transaksi**\n\nAda **${targetTransactions.length}** ${typeLabel}`;
        }

        case 'biggest': {
            const targetTransactions = filters.type === 'income' ? incomes : expenses;
            if (targetTransactions.length === 0) return 'Tidak ada data.';

            const biggest = targetTransactions.reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max);
            return `💎 **Transaksi Terbesar**\n\n**${biggest.title}**\n${formatCurrency(Number(biggest.amount), userCurrency)}\n\n📅 ${new Date(biggest.date).toLocaleDateString('id-ID')}\n🏷️ ${biggest.category?.name || 'Tanpa kategori'}`;
        }

        case 'smallest': {
            const targetTransactions = filters.type === 'income' ? incomes : expenses;
            if (targetTransactions.length === 0) return 'Tidak ada data.';

            const smallest = targetTransactions.reduce((min, t) => Number(t.amount) < Number(min.amount) ? t : min);
            return `💰 **Transaksi Terkecil**\n\n**${smallest.title}**\n${formatCurrency(Number(smallest.amount), userCurrency)}\n\n📅 ${new Date(smallest.date).toLocaleDateString('id-ID')}\n🏷️ ${smallest.category?.name || 'Tanpa kategori'}`;
        }

        case 'list': {
            const targetTransactions = filters.type === 'income' ? incomes : (filters.type === 'expense' ? expenses : transactions);
            const top10 = targetTransactions.slice(0, 10);

            if (top10.length === 0) return 'Tidak ada transaksi.';

            let response = `📋 **Daftar Transaksi**\n\n`;
            top10.forEach((t, i) => {
                response += `${i + 1}. **${t.title}**\n   ${formatCurrency(Number(t.amount), userCurrency)} • ${t.category?.name || 'Lainnya'}\n   ${new Date(t.date).toLocaleDateString('id-ID')}\n\n`;
            });

            if (targetTransactions.length > 10) {
                response += `_...dan ${targetTransactions.length - 10} transaksi lainnya_`;
            }

            return response.trim();
        }

        default:
            return null;
    }
}

// ============================================
// AI GENERATION (untuk pertanyaan kompleks)
// ============================================

async function generateAIResponse(question: string, transactions: any[], userCurrency: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = expenses.reduce((acc, t) => {
        const catName = t.category?.name || 'Lainnya';
        acc[catName] = (acc[catName] || 0) + Number(t.amount);
        return acc;
    }, {} as Record<string, number>);

    // BARU (Solusi Tepat)
    const topCategories = (Object.entries(byCategory) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amount]) => ({ category: cat, amount }));

    const sample = transactions.slice(0, 15).map(t => ({
        date: t.date,
        title: t.title,
        amount: Number(t.amount),
        type: t.type,
        category: t.category?.name || 'Lainnya'
    }));

    const prompt = `Kamu adalah asisten keuangan AI yang cerdas dan to the point.

Pertanyaan: "${question}"

Data:
- Total Pengeluaran: ${formatCurrency(totalExpense, userCurrency)}
- Total Pemasukan: ${formatCurrency(totalIncome, userCurrency)}
- Net Flow: ${formatCurrency(totalIncome - totalExpense, userCurrency)}
- Top Kategori: ${topCategories.map(c => `${c.category} (${formatCurrency(c.amount, userCurrency)})`).join(', ')}
- Sample transaksi: ${JSON.stringify(sample)}

Instruksi:
1. Jawab LANGSUNG dan TO THE POINT
2. Maksimal 3-4 kalimat untuk pertanyaan simple
3. Gunakan bullet points hanya jika perlu
4. Format angka dengan Rupiah
5. Tambahkan emoji untuk visual appeal
6. Jika memberi saran, maksimal 3 tips singkat

PENTING: Jangan bertele-tele! User ingin jawaban cepat dan jelas.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, userId } = body;

        if (!message || !userId) {
            return NextResponse.json({ error: 'Message dan userId diperlukan' }, { status: 400 });
        }

        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('currency')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            console.warn('Gagal mengambil profil user, fallback ke IDR:', profileError.message);
        }

        const userCurrency = profile?.currency || 'IDR';

        const lowerMessage = message.toLowerCase();
        const filters = parseUserQuery(lowerMessage);
        const transactions = await fetchTransactions(userId, filters);

        // Detect intent
        const intent = detectIntent(lowerMessage);

        // Try direct answer first (untuk pertanyaan simple)
        let response: string | null = null;

        if (['total', 'top_category', 'average', 'count', 'biggest', 'smallest', 'list'].includes(intent)) {
            response = generateDirectAnswer(intent, transactions, filters, lowerMessage, userCurrency);
        }

        // Jika tidak bisa dijawab langsung atau pertanyaan kompleks, gunakan AI
        if (!response || intent === 'comparison' || intent === 'advice' || intent === 'complex') {
            response = await generateAIResponse(message, transactions, userCurrency);
        }

        return NextResponse.json({
            success: true,
            reply: response,
            metadata: {
                intent,
                data_count: transactions.length,
                used_ai: !['total', 'top_category', 'average', 'count', 'biggest', 'smallest', 'list'].includes(intent),
                currency: userCurrency,
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan. Silakan coba lagi.', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}