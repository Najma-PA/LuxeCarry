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
  // ONLY DELIVERED ITEMS
  const deliveredItems = order.items.filter(
    (item) => item.status === 'Delivered' && (!itemId || item._id.toString() === itemId)
  );

  if (deliveredItems.length === 0) {
    return {
      success: false,
      message: 'No delivered items found',
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

  doc.fontSize(12).font('Helvetica').fillColor('#333');

  // LEFT COLUMN
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 70, detailsTop);

  doc.text(`Order ID: ${order.orderId || order._id}`, 70, detailsTop + 22);

  doc.text(`Order Date: ${new Date(order.createdAt).toDateString()}`, 70, detailsTop + 44);

  // SHIPPING ADDRES

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
  const qtyX = tableLeft + 150;
  const originalX = tableLeft + 190;
  const discountX = tableLeft + 270;
  const finalX = tableLeft + 350;
  const totalX = tableLeft + 430;

  // TABLE HEADER
  doc.roundedRect(tableLeft, tableTop, 500, 35, 6).fill('#111');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11);

  doc.text('Product', productX, tableTop + 11, {
    width: 130,
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

  doc.text('Final', finalX, tableTop + 11, {
    width: 70,
    align: 'right',
  });

  doc.text('Total', totalX, tableTop + 11, {
    width: 60,
    align: 'right',
  });

  doc.fillColor('#000');

  let position = tableTop + 35;

  deliveredItems.forEach((item, index) => {
    // Zebra Rows
    if (index % 2 === 0) {
      doc.rect(tableLeft, position, 500, 45).fill('#f8f8f8');
    }

    // Row Border
    doc.rect(tableLeft, position, 500, 45).stroke('#e5e5e5');

    doc.fillColor('#111').font('Helvetica').fontSize(10);

    // Product Name
    const pName = item.productName || item.product?.name || 'Product';
    const variantValue = item.variantValue || '';
    const displayName = variantValue ? `${pName} (${variantValue.charAt(0).toUpperCase()})` : pName;
    doc.text(displayName, productX, position + 15, {
      width: 130,
    });

    // Qty
    doc.text(item.quantity.toString(), qtyX, position + 15, {
      width: 30,
      align: 'center',
    });

    // Original Price
    doc.text(`RS. ${(item.originalPrice || 0).toLocaleString()}`, originalX, position + 15, {
      width: 70,
      align: 'right',
    });

    // Product Discount
    doc.text(`Rs. ${(item.productDiscount || 0).toLocaleString()}`, discountX, position + 15, {
      width: 70,
      align: 'right',
    });

    // Final Price
    doc.text(`Rs. ${(item.finalPrice || 0).toLocaleString()}`, finalX, position + 15, {
      width: 70,
      align: 'right',
    });

    // Total
    doc.text(`Rs. ${(item.totalPrice || 0).toLocaleString()}`, totalX, position + 15, {
      width: 60,
      align: 'right',
    });

    position += 45;
  });

  // TOTALS

  position += 35;

  doc.font('Helvetica').fontSize(12).fillColor('#111');

  const originalSubtotal = deliveredItems.reduce(
    (sum, item) => sum + (item.originalPrice || 0) * item.quantity,
    0
  );
  const totalDiscount = deliveredItems.reduce(
    (sum, item) => sum + (item.productDiscount || 0) * item.quantity,
    0
  );

  // Subtotal
  doc.text('Subtotal', 330, position);

  doc.text(`Rs. ${originalSubtotal.toLocaleString()}`, 430, position, {
    width: 110,
    align: 'right',
  });

  position += 22;

  // Discount
  doc.text('Discount', 330, position);

  doc.text(`- Rs. ${totalDiscount.toLocaleString()}`, 430, position, {
    width: 110,
    align: 'right',
  });

  position += 35;

  // GRAND TOTAL BOX
  doc.roundedRect(300, position - 8, 240, 40, 6).fill('#111');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(16);

  doc.text('Grand Total', 315, position + 5);
  const invoiceTotal = deliveredItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  doc.text(`Rs. ${invoiceTotal.toLocaleString()}`, 415, position + 5, {
    width: 115,
    align: 'right',
  });

  // FOOTER

  position += 80;

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
