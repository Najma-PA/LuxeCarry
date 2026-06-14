const ExcelJS = require('exceljs');

const reportService = require('../../services/admin/reportService');

exports.exportSalesExcel = async (req, res) => {
  try {
    const queryParams = { ...req.query, limit: 'all' };

    const { orders, summary } = await reportService.getSalesReport(queryParams);

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },

      { header: 'Date', key: 'date', width: 18 },

      { header: 'Customer', key: 'customer', width: 28 },

      { header: 'Products', key: 'products', width: 40 },

      { header: 'Payment Method', key: 'payment', width: 18 },

      { header: 'Total Amount', key: 'total', width: 20 },
    ];

    worksheet.mergeCells('A1:F1');

    const titleCell = worksheet.getCell('A1');

    titleCell.value = 'LuxeCarry - Sales Report';

    titleCell.font = { bold: true, size: 16 };

    titleCell.alignment = { horizontal: 'left' };

    let periodText = 'All Time';

    if (req.query.customStartDate && req.query.customEndDate) {
      periodText = `${req.query.customStartDate} - ${req.query.customEndDate}`;
    } else if (req.query.reportFilter) {
      periodText = req.query.reportFilter;
    }

    worksheet.getCell('A2').value = `Period: ${periodText}`;

    worksheet.getCell('A3').value = `Generated On: ${new Date().toLocaleDateString('en-IN')}`;

    worksheet.getCell('A5').value = 'Summary';

    worksheet.getCell('A5').font = { bold: true };

    worksheet.getCell('A6').value = 'Total Orders';

    worksheet.getCell('B6').value = summary.totalOrders || 0;

    worksheet.getCell('A7').value = 'Total Sales';

    worksheet.getCell('B7').value = summary.totalSales || 0;

    worksheet.getCell('A8').value = 'Total Discounts';

    worksheet.getCell('B8').value = summary.couponDiscount || 0;

    worksheet.getCell('A9').value = 'Total Refunds';

    worksheet.getCell('B9').value = summary.totalRefunds || 0;

    worksheet.getCell('A10').value = 'Net Revenue';

    worksheet.getCell('B10').value = summary.netRevenue || 0;

    const tableStartRow = 12;

    const headerRow = worksheet.getRow(tableStartRow);

    headerRow.values = [
      'Order ID',

      'Date',

      'Customer',

      'Products',

      'Payment Method',

      'Total Amount',
    ];

    headerRow.font = { bold: true };

    orders.forEach((order) => {
      let products = '';

      if (order.items && order.items.length > 0) {
        products = order.items.map((i) => i.productName).join(', ');
      }

      let totalRefunds = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          totalRefunds += item.refundAmount || 0;
        });
      }

      let netTotal = (order.finalAmount || order.totalAmount || 0) - totalRefunds;

      netTotal = Math.max(0, netTotal);

      worksheet.addRow({
        orderId: `#${order.orderId}`,

        date: new Date(order.createdAt).toLocaleDateString('en-IN'),

        customer: order.userId?.name || 'User',

        products: products,

        payment: order.paymentMethod,

        total: Number(netTotal),
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= tableStartRow) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E5E7EB' } },

            left: { style: 'thin', color: { argb: 'E5E7EB' } },

            bottom: { style: 'thin', color: { argb: 'E5E7EB' } },

            right: { style: 'thin', color: { argb: 'E5E7EB' } },
          };
        });
      }
    });

    res.setHeader(
      'Content-Type',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.log(error);

    res.status(500).send('Excel Export Failed');
  }
};
