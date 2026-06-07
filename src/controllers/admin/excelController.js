const ExcelJS = require('exceljs');

const reportService = require('../../services/admin/reportService');

exports.exportSalesExcel = async (req, res) => {
  try {
    const { orders, summary } = await reportService.getSalesReport(req.query);

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      {
        header: 'Order ID',
        key: 'orderId',
        width: 20,
      },

      {
        header: 'Date',
        key: 'date',
        width: 18,
      },

      {
        header: 'Customer',
        key: 'customer',
        width: 25,
      },

      {
        header: 'Payment',
        key: 'payment',
        width: 18,
      },

      {
        header: 'Coupon',
        key: 'coupon',
        width: 15,
      },

      {
        header: 'Total Amount',
        key: 'total',
        width: 20,
      },
    ];

    worksheet.mergeCells('A1:F1');

    const titleCell = worksheet.getCell('A1');

    titleCell.value = 'LuxeCarry - Sales Report';

    titleCell.font = {
      bold: true,

      size: 20,
    };

    titleCell.alignment = {
      horizontal: 'left',
    };

    worksheet.getCell('A2').value = `Period: ${req.query.customStartDate || '-'} to ${
      req.query.customEndDate || '-'
    }`;

    worksheet.getCell('A3').value = `Generated On: ${new Date().toLocaleString('en-IN')}`;

    worksheet.getCell('A5').value = 'Summary';

    worksheet.getCell('A5').font = {
      bold: true,

      size: 14,
    };

    worksheet.getCell('A6').value = 'Total Orders';

    worksheet.getCell('B6').value = summary.totalOrders || 0;

    worksheet.getCell('A7').value = 'Total Sales';

    worksheet.getCell('B7').value = summary.totalSales || 0;

    worksheet.getCell('A8').value = 'Coupon Discount';

    worksheet.getCell('B8').value = summary.couponDiscount || 0;

    worksheet.getCell('A9').value = 'Net Revenue';

    worksheet.getCell('B9').value = summary.netRevenue || 0;

    const tableStartRow = 11;

    const headerRow = worksheet.getRow(tableStartRow);

    headerRow.values = ['Order ID', 'Date', 'Customer', 'Payment', 'Coupon', 'Total Amount'];

    headerRow.font = {
      bold: true,

      color: {
        argb: 'FFFFFFFF',
      },
    };

    headerRow.fill = {
      type: 'pattern',

      pattern: 'solid',

      fgColor: {
        argb: 'C59D5F',
      },
    };

    headerRow.alignment = {
      horizontal: 'center',
    };

    orders.forEach((order) => {
      worksheet.addRow({
        orderId: `#${order.orderId}`,

        date: new Date(order.createdAt).toLocaleDateString('en-IN'),

        customer: order.userId?.name || 'User',

        payment: order.paymentMethod,

        coupon: order.couponDiscount || 0,

        total: order.finalAmount || 0,
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: 'thin',
          },

          left: {
            style: 'thin',
          },

          bottom: {
            style: 'thin',
          },

          right: {
            style: 'thin',
          },
        };
      });
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
