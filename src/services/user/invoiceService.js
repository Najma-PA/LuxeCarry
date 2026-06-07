const PDFDocument = require('pdfkit');
const path = require('path');
const Order = require('../../models/orderModel');

exports.generateInvoice = async (orderId, itemId, res) => {
  const order = await Order.findById(orderId).populate('userId').populate('items.product');

  if (!order) {
    return {
      success: false,
      message: 'Order not found',
    };
  }

  // ITEM-WISE INVOICE ITEMS

  const invoiceItems = order.items.filter(
    (item) =>
      ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(item.status) &&
      (!itemId || item._id.toString() === itemId)
  );

  if (invoiceItems.length === 0) {
    return {
      success: false,
      message: 'No invoice items found',
    };
  }

  // PDF

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
  });

  const fileName = `invoice-${order.orderId || order._id}.pdf`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  res.setHeader('Content-Type', 'application/pdf');

  doc.pipe(res);

  // HEADER

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

  // ORDER DETAILS

  const detailsTop = doc.y + 20;

  const invoiceNumber = `INV-${itemId.toString().slice(-6).toUpperCase()}`;

  doc.fontSize(12).font('Helvetica').fillColor('#333');

  // LEFT COLUMN

  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 70, detailsTop);

  doc.text(`Invoice No: ${invoiceNumber}`, 70, detailsTop + 22);

  doc.text(`Order ID: ${order.orderId || order._id}`, 70, detailsTop + 44);

  doc.text(`Order Date: ${new Date(order.createdAt).toDateString()}`, 70, detailsTop + 68);

  // SHIPPING ADDRESS

  const addressTop = detailsTop;

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#111')
    .text('Shipping Address', 340, addressTop);

  doc.font('Helvetica').fontSize(11).fillColor('#444');

  doc.text(`${order.shippingAddress.name}`, 340, addressTop + 24);

  doc.text(`${order.shippingAddress.street}`, 340, addressTop + 42, {
    width: 200,
  });

  doc.text(
    `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
    340,
    addressTop + 62,
    {
      width: 200,
    }
  );

  doc.text(`${order.shippingAddress.country}`, 340, addressTop + 82);

  doc.text(`Phone: ${order.shippingAddress.phone}`, 340, addressTop + 100);

  doc.text(`Email: ${order.userId.email}`, 340, addressTop + 118, {
    width: 200,
  });

  // PRODUCTS TABLE

  doc.y = addressTop + 170;

  const tableTop = doc.y;

  const tableLeft = 50;

  const productX = tableLeft + 10;
  const qtyX = tableLeft + 170;
  const originalX = tableLeft + 240;
  const discountX = tableLeft + 330;
  const finalX = tableLeft + 430;

  // TABLE HEADER

  doc.roundedRect(tableLeft, tableTop, 500, 35, 6).fill('#111');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11);

  doc.text('Product', productX, tableTop + 11, {
    width: 150,
  });

  doc.text('Qty', qtyX, tableTop + 11, {
    width: 30,
    align: 'center',
  });

  doc.text('Original', originalX, tableTop + 11, {
    width: 70,
    align: 'right',
  });

  doc.text('Discount', discountX, tableTop + 11, {
    width: 70,
    align: 'right',
  });

  doc.text('Total', finalX, tableTop + 11, {
    width: 70,
    align: 'right',
  });

  doc.fillColor('#000');

  let position = tableTop + 35;

  invoiceItems.forEach((item, index) => {
    // ZEBRA ROWS

    if (index % 2 === 0) {
      doc.rect(tableLeft, position, 500, 45).fill('#f8f8f8');
    }

    // ROW BORDER

    doc.rect(tableLeft, position, 500, 45).stroke('#e5e5e5');

    doc.fillColor('#111').font('Helvetica').fontSize(10);

    // PRODUCT NAME

    const pName = item.productName || item.product?.name || 'Product';

    const variantValue = item.variantValue || '';

    const displayName = variantValue ? `${pName} (${variantValue})` : pName;

    doc.text(displayName, productX, position + 15, {
      width: 150,
    });

    // QTY

    doc.text(item.quantity.toString(), qtyX, position + 15, {
      width: 30,
      align: 'center',
    });

    // ORIGINAL PRICE

    doc.text(`Rs. ${(item.originalPrice || 0).toLocaleString()}`, originalX, position + 15, {
      width: 70,
      align: 'right',
    });

    // DISCOUNT

    doc.text(`- Rs. ${(item.productDiscount || 0).toLocaleString()}`, discountX, position + 15, {
      width: 70,
      align: 'right',
    });

    // TOTAL

    doc.text(`Rs. ${(item.totalPrice || 0).toLocaleString()}`, finalX, position + 15, {
      width: 70,
      align: 'right',
    });

    position += 45;
  });

  // TOTALS

  position += 35;

  doc.font('Helvetica').fontSize(12).fillColor('#111');

  const originalSubtotal = invoiceItems.reduce(
    (sum, item) => sum + (item.originalPrice || 0) * item.quantity,
    0
  );

  const totalDiscount = invoiceItems.reduce(
    (sum, item) => sum + (item.productDiscount || 0) * item.quantity,
    0
  );

  const totalCouponDiscount = invoiceItems.reduce(
    (sum, item) => sum + (item.couponDiscount || 0),
    0
  );

  const finalPayable = invoiceItems.reduce(
    (sum, item) => sum + (item.finalPayable || item.totalPrice || 0),
    0
  );

  // SUBTOTAL

  doc.text('Subtotal', 330, position);

  doc.text(`Rs. ${originalSubtotal.toLocaleString()}`, 430, position, {
    width: 110,
    align: 'right',
  });

  position += 22;

  // DISCOUNT

  doc.text('Product Discount', 330, position);

  doc.text(`- Rs. ${totalDiscount.toLocaleString()}`, 430, position, {
    width: 110,
    align: 'right',
  });

  position += 22;

  // COUPON DISCOUNT
  if (totalCouponDiscount > 0) {
    doc.text('Coupon Discount', 330, position);

    doc.text(`- Rs. ${totalCouponDiscount.toLocaleString()}`, 430, position, {
      width: 110,
      align: 'right',
    });

    position += 22;
  }

  // Add padding before grand total
  position += 13;

  // GRAND TOTAL BOX

  doc.roundedRect(300, position - 8, 240, 40, 6).fill('#111');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(16);

  doc.text('Grand Total', 315, position + 5);

  doc.text(`Rs. ${finalPayable.toLocaleString()}`, 415, position + 5, {
    width: 115,
    align: 'right',
  });

  // PAYMENT DETAILS

  position += 70;

  doc.fillColor('#444').font('Helvetica').fontSize(11);

  doc.text(`Payment Method: ${order.paymentMethod}`, 50, position);

  doc.text(
    `Payment Status: ${order.paymentMethod === 'COD' ? 'Pending' : 'Paid'}`,
    50,
    position + 18
  );

  // FOOTER

  position += 70;

  doc
    .fillColor('gray')
    .font('Helvetica')
    .fontSize(11)
    .text('Thank you for shopping with LuxeCarry!', 50, position, {
      width: 500,
      align: 'center',
    });

  // END PDF

  doc.end();

  return {
    success: true,
  };
};
