const productService = require('../services/userProductServices');
const Category = require('../models/categoryModel');


//LOAD SHOP PAGE
exports.loadShop = async (req, res) => {
  try {

    const data = await productService.getShopProducts(req.query);

    // 👉 get categories for filter
    const categories = await Category.find({ isActive: true });

    res.render('user/shop', {
      ...data,
      categories
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};