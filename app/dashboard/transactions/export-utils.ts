import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TransactionWithWallet } from './columns';

// Format uang ke Rupiah
const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Format tanggal
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

// Export ke PDF
export const exportToPDF = (transactions: TransactionWithWallet[]) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // === HEADER ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Transactions Report', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 27);

    // === DATA TABEL ===
    const tableData = transactions.map((t) => [
        formatDate(t.date),
        t.title,
        t.type.toUpperCase(),
        t.category?.name || '-',
        t.wallet?.name || '-',
        formatRupiah(Number(t.amount)),
        t.source || '-',
    ]);

    autoTable(doc, {
        head: [['Date', 'Title', 'Type', 'Category', 'Wallet', 'Amount', 'Source']],
        body: tableData,
        startY: 33,
        styles: {
            font: 'helvetica',
            fontSize: 8.5, // ukuran font tabel lebih kecil
            cellPadding: 2.5,
            valign: 'middle',
        },
        headStyles: {
            fillColor: [16, 185, 129], // emerald-500
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // abu-abu lembut
        },
        columnStyles: {
            0: { cellWidth: 22 }, // Date
            1: { cellWidth: 38 }, // Title
            2: { cellWidth: 22 }, // Type
            3: { cellWidth: 24 }, // Category
            4: { cellWidth: 24 }, // Wallet
            5: { cellWidth: 28, halign: 'right' }, // Amount
            6: { cellWidth: 22 }, // Source
        },
    });

    // === SUMMARY ===
    const finalY = (doc as any).lastAutoTable.finalY || 33;
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Summary', 14, finalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 197, 94);
    doc.text(`Total Income: ${formatRupiah(totalIncome)}`, 14, finalY + 17);

    doc.setTextColor(239, 68, 68);
    doc.text(`Total Expense: ${formatRupiah(totalExpense)}`, 14, finalY + 24);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Net Balance: ${formatRupiah(netBalance)}`, 14, finalY + 32);

    // === SIMPAN PDF ===
    doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export ke Excel (tidak diubah logikanya)
// Export ke Excel dengan struktur yang lebih rapi
export const exportToExcel = (transactions: TransactionWithWallet[]) => {
    // === 1. SIAPKAN DATA UTAMA ===
    const mainData = transactions.map((t) => ({
        Date: formatDate(t.date),
        Title: t.title,
        Type: t.type.toUpperCase(),
        Category: t.category?.name || '-',
        Wallet: t.wallet?.name || '-',
        // Kirim Amount sebagai angka agar bisa dihitung di Excel
        Amount: Number(t.amount),
        Source: t.source || '-',
    }));

    // === 2. BUAT WORKSHEET KOSONG ===
    const worksheet = XLSX.utils.json_to_sheet([]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // === 3. TAMBAHKAN JUDUL LAPORAN ===
    XLSX.utils.sheet_add_aoa(worksheet, [['Transaction Report']], { origin: 'A1' });
    // Styling sederhana (merge cell A1 sampai G1)
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];


    // === 4. TAMBAHKAN DATA UTAMA KE SHEET ===
    // Mulai dari baris A4 untuk memberi jarak dari judul
    XLSX.utils.sheet_add_json(worksheet, mainData, {
        origin: 'A4',
        skipHeader: false, // Kita ingin header dari mainData ditampilkan
    });

    // === 5. SIAPKAN & TAMBAHKAN DATA SUMMARY ===
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    const summaryData = [
        { Label: 'SUMMARY' },
        { Label: 'Total Income', Amount: totalIncome },
        { Label: 'Total Expense', Amount: totalExpense },
        { Label: 'Net Balance', Amount: netBalance },
    ];

    // Tambahkan summary di bawah tabel utama
    // `mainData.length + 7` memberi jarak 2 baris kosong
    XLSX.utils.sheet_add_json(worksheet, summaryData, {
        origin: `B${mainData.length + 7}`, // Tempatkan di kolom B agar menjorok
        skipHeader: true, // Kita tidak butuh header "Label" dan "Amount"
    });

    // === 6. ATUR LEBAR KOLOM ===
    worksheet['!cols'] = [
        { wch: 15 }, // A - Date
        { wch: 30 }, // B - Title / Summary Label
        { wch: 15 }, // C - Type / Summary Amount
        { wch: 20 }, // D - Category
        { wch: 20 }, // E - Wallet
        { wch: 20 }, // F - Amount
        { wch: 15 }, // G - Source
    ];

    // Format kolom Amount (C dan F) sebagai angka dengan format Rupiah
    // Loop untuk menerapkan format ke kolom F (Amount data utama)
    for (let i = 5; i <= mainData.length + 4; i++) {
        const cellRef = `F${i}`;
        if (worksheet[cellRef]) {
            worksheet[cellRef].t = 'n'; // 'n' untuk number
            worksheet[cellRef].z = '"Rp"#,##0'; // Format Rupiah
        }
    }
    // Format untuk kolom C (Amount summary)
    const summaryStartRow = mainData.length + 8;
    for (let i = 0; i < 3; i++) {
        const cellRef = `C${summaryStartRow + i}`;
        if (worksheet[cellRef]) {
            worksheet[cellRef].t = 'n';
            worksheet[cellRef].z = '"Rp"#,##0';
        }
    }


    // === 7. SIMPAN FILE ===
    XLSX.writeFile(
        workbook,
        `transactions_${new Date().toISOString().split('T')[0]}.xlsx`
    );
};
