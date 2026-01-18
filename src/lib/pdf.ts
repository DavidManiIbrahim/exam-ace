import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Type extension for jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

export const exportResultsToPDF = (results: any[], examTitle: string) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Add Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(`${examTitle} - Results`, 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Table columns
    const tableColumn = ["Student Name", "Email", "Score", "Percentage", "Status"];

    // Table rows
    const tableRows = results.map(result => {
        const studentName = result.student_profile?.full_name || 'N/A';
        const email = result.student_profile?.email || 'N/A';
        const score = `${result.total_score || 0} / ${result.max_score || 0}`;
        const pct = Math.round(((result.total_score || 0) / (result.max_score || 1)) * 100);
        const status = pct >= 60 ? "Passed" : "Failed";

        return [studentName, email, score, `${pct}%`, status];
    });

    // Generate Table
    doc.autoTable({
        startY: 35,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillStyle: '#4f46e5' }, // indigo-600 color
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // Save the PDF
    doc.save(`${examTitle.replace(/\s+/g, '_')}_Results.pdf`);
};
