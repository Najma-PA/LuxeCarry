const PDFDocument = require('pdfkit');
const Order = require('../../models/orderModel');
const reportService = require('../../services/admin/reportService');

exports.exportSalesPDF = async (req, res) => {
  try {
    const { orders, summary } = await reportService.getSalesReport(req.query);

    const doc = new PDFDocument({
      margin: 40,

      size: 'A4',
    });

    // RESPONSE HEADERS
    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    doc.pipe(res);

    const primaryColor = '#c59d5f';
    const darkColor = '#111827';
    const lightGray = '#6b7280';
    const borderColor = '#e5e7eb';

    doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('LuxeCarry', 40, 40);

    doc.fillColor(darkColor).fontSize(20).text('Sales Report', 40, 80);

    doc
      .fillColor(lightGray)
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 40, 105);

    doc.moveTo(40, 130).lineTo(555, 130).strokeColor(borderColor).stroke();

    let summaryY = 150;

    const summaryData = [
      {
        label: 'Total Sales',
        value: `₹${Number(summary.totalSales || 0).toLocaleString()}`,
      },

      {
        label: 'Orders',
        value: summary.totalOrders,
      },

      {
        label: 'Coupon Discount',
        value: `₹${Number(summary.couponDiscount || 0).toLocaleString()}`,
      },

      {
        label: 'Net Revenue',
        value: `₹${Number(summary.netRevenue || 0).toLocaleString()}`,
      },
    ];

    summaryData.forEach((item, index) => {
      const x = 40 + index * 130;

      doc.roundedRect(x, summaryY, 115, 55, 8).fillAndStroke('#faf7f2', borderColor);

      doc
        .fillColor(lightGray)
        .fontSize(9)
        .font('Helvetica')
        .text(item.label, x + 10, summaryY + 10);

      doc
        .fillColor(darkColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(item.value, x + 10, summaryY + 28);
    });

    let tableTop = 250;

    doc.rect(40, tableTop, 515, 28).fill(primaryColor);

    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    doc.text('Order ID', 50, tableTop + 9);
    doc.text('Customer', 145, tableTop + 9);
    doc.text('Date', 275, tableTop + 9);
    doc.text('Payment', 355, tableTop + 9);
    doc.text('Amount', 455, tableTop + 9);

    let y = tableTop + 35;

    orders.forEach((order, index) => {
      if (y > 730) {
        doc.addPage();

        y = 50;
      }

      if (index % 2 === 0) {
        doc.rect(40, y - 5, 515, 28).fill('#fafafa');
      }

      doc.fillColor(darkColor).fontSize(9).font('Helvetica');

      doc.text(`#${order.orderId}`, 50, y);

      doc.text(order.userId?.name || 'User', 145, y);

      doc.text(new Date(order.createdAt).toLocaleDateString('en-IN'), 275, y);

      doc.text(order.paymentMethod || 'N/A', 355, y);

      doc.text(`₹${Number(order.finalAmount || 0).toLocaleString()}`, 455, y);

      y += 30;
    });

    doc.fontSize(9).fillColor(lightGray).text('LuxeCarry Admin Sales Report', 40, 780, {
      align: 'center',
      width: 515,
    });

    doc.end();
  } catch (error) {
    console.log(error);

    res.status(500).send('PDF Generation Failed');
  }
};
