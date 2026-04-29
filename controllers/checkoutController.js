const cartService = require('../services/cartService');
const Address = require('../models/addressModel');

exports.getCheckoutPage = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : (req.session.user ? req.session.user.id : null);
        
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
            user: req.session.user
        });

    } catch (error) {
        console.error('Checkout Page Error:', error);
        res.status(500).send('Server Error');
    }
};
