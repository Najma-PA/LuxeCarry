const cartService = require('../../services/user/cartService');

const Address = require('../../models/addressModel');

const Order = require('../../models/orderModel');

const Product = require('../../models/productModel');

const Cart = require('../../models/cartModel');

exports.getCheckoutPage = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const cart = await cartService.getCart(userId);

    if (!cart || cart.items.length === 0) {
      return res.redirect('/user/cart');
    }

    // Check for out of stock or insufficient stock items

    const validation = await cartService.validateCart(userId);

    if (!validation.success) {
      return res.redirect('/user/cart');
    }

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    // Calculate Tax (e.g. 5%)

    const tax = Math.round(cart.total * 0.05);

    const finalTotal = cart.total + tax;

    res.render('user/checkout', {
      cart,

      addresses,

      tax,

      finalTotal,

      user: req.session.user,
    });
  } catch (error) {
    console.error('Checkout Page Error:', error);

    res.status(500).send('Server Error');
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).send('Shipping address is required');
    }

    // 1. Fetch and validate selected address

    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).send('Selected shipping address not found');
    }

    // 2. Fetch active cart

    const cart = await cartService.getCart(userId);

    if (!cart || cart.items.length === 0) {
      return res.redirect('/user/cart');
    }

    // 3. Validate cart stock & availability

    const validation = await cartService.validateCart(userId);

    if (!validation.success) {
      return res.redirect('/user/cart');
    }

    // 4. Calculate pricing

    const tax = Math.round(cart.total * 0.05);

    const finalTotal = cart.total + tax;

    // 5. Build order items and deduct stock

    const orderItems = [];

    for (const item of cart.items) {
      const price = item.finalPrice;

      const variantDetail = item.variantDetail;

      orderItems.push({
        product: item.product._id,

        variant: item.variant || null,

        variantValue: variantDetail ? variantDetail.value : null,

        quantity: item.quantity,

        price: price,
      });

      // Deduct stock

      if (item.variant) {
        await Product.updateOne(
          { _id: item.product._id, 'variants._id': item.variant },

          { $inc: { 'variants.$.stock': -item.quantity } }
        );
      } else {
        await Product.updateOne({ _id: item.product._id }, { $inc: { stock: -item.quantity } });
      }
    }

    // 6. Create the order with the shippingAddress snapshot

    const order = await Order.create({
      userId,

      items: orderItems,

      shippingAddress: {
        name: address.name,

        phone: address.phone,

        street: address.street,

        city: address.city,

        state: address.state,

        pincode: address.pincode,

        country: address.country,
      },

      paymentMethod,

      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',

      subtotal: cart.subtotal,

      tax: tax,

      discount: cart.totalDiscount,

      totalAmount: finalTotal,

      status: 'Pending',
    });

    // 7. Clear the user's cart

    await Cart.deleteOne({ user: userId });

    // 8. Redirect to order success page

    res.redirect(`/user/order-success/${order._id}`);
  } catch (error) {
    console.error('Order Placement Error:', error);

    res.status(500).send('Failed to place order');
  }
};

exports.getOrderSuccessPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.redirect('/user/home');
    }

    res.render('user/orderSuccess', {
      order,

      user: req.session.user,
    });
  } catch (error) {
    console.error('Order Success Page Error:', error);

    res.redirect('/user/home');
  }
};

