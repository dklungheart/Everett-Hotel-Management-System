const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { query, queryOne } = require('../config/database');

function setPdfHeaders(res, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

function setExcelHeaders(res, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

async function generateBookingReportPdf(res, bookings, summary) {
  const filename = `booking-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  setPdfHeaders(res, filename);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text('EVERETT HOTEL', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Westlands, Nairobi, Kenya | +254 700 123 456', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text('Booking Report', { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(`Total Bookings: ${summary.totalBookings}`);
  doc.text(`Total Revenue: KES ${parseFloat(summary.totalRevenue).toLocaleString()}`);
  doc.text(`Average Booking Value: KES ${parseFloat(summary.averageValue).toLocaleString()}`);
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('Bookings Detail', { underline: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colWidths = [80, 100, 60, 60, 70, 70];
  const headers = ['Reference', 'Guest', 'Room', 'Status', 'Check-In', 'Amount'];

  doc.fontSize(8).font('Helvetica-Bold');
  let x = 40;
  headers.forEach((h, i) => {
    doc.text(h, x, tableTop, { width: colWidths[i] });
    x += colWidths[i];
  });

  doc.moveTo(40, tableTop + 12).lineTo(555, tableTop + 12).stroke();

  doc.font('Helvetica').fontSize(7);
  let y = tableTop + 18;

  bookings.forEach((b, index) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }

    x = 40;
    const row = [
      b.booking_reference || '',
      `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      b.room_number || '',
      b.status || '',
      b.check_in ? new Date(b.check_in).toLocaleDateString('en-KE') : '',
      `KES ${parseFloat(b.final_amount || 0).toLocaleString()}`
    ];

    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], ellipsis: true });
      x += colWidths[i];
    });

    y += 14;

    if (index < bookings.length - 1) {
      doc.moveTo(40, y - 2).lineTo(555, y - 2).strokeOpacity(0.3).stroke();
    }
  });

  doc.end();
}

async function generatePaymentReportPdf(res, payments, summary) {
  const filename = `payment-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  setPdfHeaders(res, filename);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text('EVERETT HOTEL', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Westlands, Nairobi, Kenya', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text('Payment Report', { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(`Total Payments: ${summary.totalPayments}`);
  doc.text(`Total Revenue: KES ${parseFloat(summary.totalRevenue).toLocaleString()}`);
  doc.text(`Pending Payments: ${summary.pendingPayments}`);
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('Payments Detail', { underline: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colWidths = [80, 90, 70, 70, 60, 85];
  const headers = ['Reference', 'Guest', 'Method', 'Amount', 'Status', 'Date'];

  doc.fontSize(8).font('Helvetica-Bold');
  let x = 40;
  headers.forEach((h, i) => {
    doc.text(h, x, tableTop, { width: colWidths[i] });
    x += colWidths[i];
  });

  doc.moveTo(40, tableTop + 12).lineTo(555, tableTop + 12).stroke();

  doc.font('Helvetica').fontSize(7);
  let y = tableTop + 18;

  payments.forEach((p, index) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }

    x = 40;
    const row = [
      p.payment_reference || '',
      `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      (p.method || '').toUpperCase(),
      `KES ${parseFloat(p.amount || 0).toLocaleString()}`,
      p.status || '',
      p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-KE') : 'N/A'
    ];

    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], ellipsis: true });
      x += colWidths[i];
    });

    y += 14;
    if (index < payments.length - 1) {
      doc.moveTo(40, y - 2).lineTo(555, y - 2).strokeOpacity(0.3).stroke();
    }
  });

  doc.end();
}

async function generateBookingReportExcel(res, bookings, summary) {
  const filename = `booking-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  setExcelHeaders(res, filename);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Everett Hotel';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.addRow({ metric: 'Total Bookings', value: summary.totalBookings });
  summarySheet.addRow({ metric: 'Total Revenue (KES)', value: parseFloat(summary.totalRevenue).toLocaleString() });
  summarySheet.addRow({ metric: 'Average Booking Value (KES)', value: parseFloat(summary.averageValue).toLocaleString() });

  summarySheet.getRow(1).font = { bold: true };

  const bookingsSheet = workbook.addWorksheet('Bookings');
  bookingsSheet.columns = [
    { header: 'Reference', key: 'booking_reference', width: 20 },
    { header: 'Guest Name', key: 'guest_name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Room', key: 'room_number', width: 10 },
    { header: 'Room Category', key: 'room_category', width: 20 },
    { header: 'Check-In', key: 'check_in', width: 15 },
    { header: 'Check-Out', key: 'check_out', width: 15 },
    { header: 'Adults', key: 'adults', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total Amount (KES)', key: 'final_amount', width: 20 },
    { header: 'Created At', key: 'created_at', width: 20 },
  ];

  bookingsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  bookingsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D4AF37' } };

  bookings.forEach(b => {
    bookingsSheet.addRow({
      booking_reference: b.booking_reference,
      guest_name: `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      email: b.email,
      room_number: b.room_number,
      room_category: b.room_category,
      check_in: b.check_in ? new Date(b.check_in).toLocaleDateString('en-KE') : '',
      check_out: b.check_out ? new Date(b.check_out).toLocaleDateString('en-KE') : '',
      adults: b.adults,
      status: b.status,
      final_amount: parseFloat(b.final_amount || 0),
      created_at: b.created_at ? new Date(b.created_at).toLocaleDateString('en-KE') : '',
    });
  });

  await workbook.xlsx.write(res);
  res.end();
}

async function generatePaymentReportExcel(res, payments, summary) {
  const filename = `payment-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  setExcelHeaders(res, filename);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Everett Hotel';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.addRow({ metric: 'Total Payments', value: summary.totalPayments });
  summarySheet.addRow({ metric: 'Total Revenue (KES)', value: parseFloat(summary.totalRevenue).toLocaleString() });
  summarySheet.addRow({ metric: 'Pending Payments', value: summary.pendingPayments });

  summarySheet.getRow(1).font = { bold: true };

  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.columns = [
    { header: 'Reference', key: 'payment_reference', width: 22 },
    { header: 'Guest Name', key: 'guest_name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Booking Ref', key: 'booking_reference', width: 22 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Amount (KES)', key: 'amount', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Transaction ID', key: 'transaction_id', width: 25 },
    { header: 'Paid At', key: 'paid_at', width: 20 },
    { header: 'Created At', key: 'created_at', width: 20 },
  ];

  paymentsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  paymentsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D4AF37' } };

  payments.forEach(p => {
    paymentsSheet.addRow({
      payment_reference: p.payment_reference,
      guest_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.email,
      booking_reference: p.booking_reference,
      method: (p.method || '').toUpperCase(),
      amount: parseFloat(p.amount || 0),
      status: p.status,
      transaction_id: p.transaction_id,
      paid_at: p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-KE') : 'N/A',
      created_at: p.created_at ? new Date(p.created_at).toLocaleDateString('en-KE') : '',
    });
  });

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  generateBookingReportPdf,
  generatePaymentReportPdf,
  generateBookingReportExcel,
  generatePaymentReportExcel,
};
