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

    // 3. get recommended products for bottom section
    const recommendedProducts = await Product.find({ isActive: true }).limit(4);

    //render AFTER everything is ready
    res.render('user/shop', {
      ...data,
      categories,
      colors,
      recommendedProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// LOAD PRODUCT DETAILS PAGE
exports.loadProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
      return res.redirect('/user/shop');
    }

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    res.render('user/product', {
      product,
      relatedProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};