const PDFDocument = require('pdfkit');

const reportService = require('../../services/admin/reportService');

exports.exportSalesPDF = async (req, res) => {
  try {
    const queryParams = { ...req.query, limit: 'all' };
    const { orders, summary } = await reportService.getSalesReport(queryParams);

    const doc = new PDFDocument({
      margin: 40,

      size: 'A4',
    });

    // RESPONSE HEADERS

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    doc.pipe(res);

    // COLORS

    const primaryColor = '#c59d5f';
    const darkColor = '#111827';
    const lightGray = '#6b7280';

    // HEADER
    doc
      .fillColor('#000000')
      .fontSize(22)
      .font('Helvetica')
      .text('LuxeCarry - Sales Report', 40, 40, { align: 'center' });

    let periodText = 'All Time';
    if (req.query.customStartDate && req.query.customEndDate) {
      periodText = `${req.query.customStartDate} - ${req.query.customEndDate}`;
    } else if (req.query.reportFilter) {
      periodText = req.query.reportFilter;
    }

    doc
      .fillColor('#000000')
      .fontSize(11)
      .font('Helvetica')
      .text(`Generated On: ${new Date().toLocaleString('en-US')}`, 40, 90);

    doc.text(`Report Period: ${periodText}`, 40, 105);

    // SUMMARY BLOCK
    doc.fontSize(13).font('Helvetica-Bold').text('Summary', 40, 135);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Orders: ${summary.totalOrders || 0}`, 40, 155);
    doc.text(`Total Sales: INR ${(summary.totalSales || 0).toLocaleString('en-IN')}`, 40, 170);
    doc.text(
      `Total Discounts: INR ${(summary.couponDiscount || 0).toLocaleString('en-IN')}`,
      40,
      185
    );
    doc.text(`Total Refunds: INR ${(summary.totalRefunds || 0).toLocaleString('en-IN')}`, 40, 200);
    doc.text(`Net Revenue: INR ${(summary.netRevenue || 0).toLocaleString('en-IN')}`, 40, 220);

    let tableTop = 250;

    doc.rect(40, tableTop, 515, 28).fill(primaryColor);

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

    doc.text('Order ID', 45, tableTop + 9);

    doc.text('Date', 105, tableTop + 9);

    doc.text('Customer', 165, tableTop + 9);

    doc.text('Products', 245, tableTop + 9);

    doc.text('Payment', 365, tableTop + 9);

    doc.text('Amount', 460, tableTop + 9);

    let y = tableTop + 35;

    orders.forEach((order, index) => {
      if (y > 730) {
        doc.addPage();
        doc.rect(40, 50, 515, 28).fill(primaryColor);
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('Order ID', 45, 59);
        doc.text('Date', 105, 59);
        doc.text('Customer', 165, 59);
        doc.text('Products', 245, 59);
        doc.text('Payment', 365, 59);
        doc.text('Amount', 460, 59);
        y = 50;
      }

      if (index % 2 === 0) {
        doc.rect(40, y - 5, 515, 28).fill('#fafafa');
      }

      doc.fillColor(darkColor).fontSize(8).font('Helvetica');

      doc.text(`#${order.orderId}`, 45, y, {
        width: 55,
      });

      doc.text(new Date(order.createdAt).toLocaleDateString('en-IN'), 105, y, {
        width: 55,
      });

      doc.text(order.userId?.name || 'User', 165, y, {
        width: 75,
      });

      // PRODUCTS
      let products = '';
      if (order.items && order.items.length > 0) {
        products = order.items.map((i) => i.productName).join(', ');
        if (products.length > 30) {
          products = products.substring(0, 30) + '...';
        }
      }

      doc.text(products, 245, y, {
        width: 115,
      });

      doc.text(order.paymentMethod || 'N/A', 365, y, {
        width: 85,
      });

      let totalRefunds = 0;
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          totalRefunds += item.refundAmount || 0;
        });
      }
      let netTotal = (order.finalAmount || order.totalAmount || 0) - totalRefunds;
      netTotal = Math.max(0, netTotal);

      doc.text(`Rs.${Number(netTotal).toLocaleString()}`, 460, y, {
        width: 60,
      });

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
