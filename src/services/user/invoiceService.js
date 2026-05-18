const PDFDocument = require('pdfkit');
const path = require('path');
const Order = require('../../models/orderModel');

exports.generateInvoice = async (orderId, res) => {
  const order = await Order.findById(orderId).populate('userId').populate('items.product');

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  // Create PDF
  const doc = new PDFDocument({
    margin: 50,
  });

  const fileName = `invoice-${order.orderId || order._id}.pdf`;

  // Response headers
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  res.setHeader('Content-Type', 'application/pdf');

  // Pipe PDF
  doc.pipe(res);

  //header

  const logoPath = path.join(__dirname, '../../../public/images/logo.png');

  const logoWidth = 45;
  const titleWidth = 220;

  const startX = (doc.page.width - logoWidth - titleWidth) / 2;

  doc.image(logoPath, startX, 45, {
    width: logoWidth,
  });

  doc
    .fontSize(30)
    .font('Helvetica-Bold')
    .fillColor('#111')
    .text('LuxeCarry', startX + 60, 50);

  doc
    .fontSize(13)
    .font('Helvetica')
    .fillColor('gray')
    .text('Premium Bags Collection', startX + 62, 85);

  doc.moveDown(3);

  doc.fontSize(24).font('Helvetica').fillColor('#666').text('INVOICE', 0, doc.y, {
    align: 'center',
  });
  doc.moveDown(2);

  //orderdetails

  doc.moveDown(3);

  const detailsTop = doc.y;

  doc.fontSize(13).fillColor('#333').font('Helvetica');

  // LEFT COLUMN
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 80, detailsTop);

  doc.text(`Order ID: ${order.orderId || order._id}`, 80, detailsTop + 25);

  doc.text(`Order Date: ${order.createdAt.toDateString()}`, 80, detailsTop + 50);

  // RIGHT COLUMN
  doc.text(`Customer: ${order.userId.name}`, 340, detailsTop);

  doc.text(`Email: ${order.userId.email}`, 340, detailsTop + 25);
  //products

  doc.moveDown(6);

  const tableTop = doc.y;

  const tableLeft = 70;

  const productX = tableLeft + 10;
  const qtyX = tableLeft + 300;
  const priceX = tableLeft + 380;
  const totalX = tableLeft + 470;

  // Header Background
  doc.rect(tableLeft, tableTop, 520, 35).fill('#111');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12);

  doc.text('Product', productX, tableTop + 11);

  doc.text('Qty', qtyX, tableTop + 11);

  doc.text('Price', priceX, tableTop + 11);

  doc.text('Total', totalX, tableTop + 11);

  // Reset color
  doc.fillColor('#000');

  let position = tableTop + 35;

  let totalAmount = 0;

  order.items.forEach((item) => {
    const total = item.quantity * item.price;

    totalAmount += total;

    // Row Border
    doc.rect(tableLeft, position, 520, 40).stroke('#ddd');

    doc.font('Helvetica').fontSize(12);

    doc.text(item.product?.name || item.product?.productName, productX, position + 13);

    doc.text(item.quantity.toString(), qtyX, position + 13);

    doc.text(`₹${item.price}`, priceX, position + 13);

    doc.text(`₹${total}`, totalX, position + 13);

    position += 40;
  });
  //Total

  doc.moveDown(4);

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor('#111')
    .text(`Grand Total: ₹${totalAmount}`, 0, position + 40, {
      align: 'right',
    });

  doc.moveDown(3);

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('gray')
    .text('Thank you for shopping with LuxeCarry!', 50, position + 100, {
      width: 500,
      align: 'center',
    });
  doc.end();

  return {
    success: true,
  };
};
