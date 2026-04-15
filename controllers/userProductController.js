const productService = require('../services/userProductServices');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel'); // 👈 ADD THIS

//LOAD SHOP PAGE
exports.loadShop = async (req, res) => {
  try {

    const data = await productService.getShopProducts(req.query);

    // get categories
    const categories = await Category.find({ isActive: true });

    // get all products (for color filter)
    const allProducts = await Product.find({ isActive: true }).lean();

    let colors = [];

    allProducts.forEach(p => {
      if (p.variants && Array.isArray(p.variants)) {
        p.variants.forEach(v => {
          if (v.type && v.type.trim().toLowerCase() === "color" && !colors.includes(v.value)) {
            colors.push(v.value);
          }
        });
      }
    });

    console.log("Found colors:", colors);

    //render AFTER everything is ready
    res.render('user/shop', {
      ...data,
      categories,
      colors  
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// LOAD PRODUCT DETAILS PAGE
exports.loadProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category').lean();

    if (!product) {
      return res.redirect('/user/shop');
    }

    res.render('user/product', {
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};