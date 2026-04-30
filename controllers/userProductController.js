const productService = require('../services/userProductServices');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel'); // 👈 ADD THIS

//LOAD SHOP PAGE
exports.loadShop = async (req, res) => {
  try {

    const data = await productService.getShopProducts(req.query);

    // get categories
    const categories = await Category.find({ isActive: true, isDeleted: { $ne: true } });

    // get all products (for color filter)
    const allProducts = await Product.find({ isActive: true }).lean();

    let colorsMap = new Set();
    allProducts.forEach(p => {
      if (p.variants && Array.isArray(p.variants)) {
        p.variants.forEach(v => {
          if (v.type && v.type.trim().toLowerCase() === "color" && v.value) {
            colorsMap.add(v.value.trim().toLowerCase());
          }
        });
      }
    });

    // Convert back to Array and capitalize for display
    let colors = Array.from(colorsMap).map(c => {
       return c.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    });


    // Detect AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const gridHtml = await new Promise((resolve, reject) => {
        res.render('partials/user/product-grid', { ...data }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      const paginationHtml = await new Promise((resolve, reject) => {
        res.render('partials/user/pagination', { ...data }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      return res.json({
        success: true,
        gridHtml,
        paginationHtml,
        currentPage: data.currentPage,
        totalPages: data.totalPages
      });
    }

    // Standard render for normal page load
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
    
    const product = await Product.findById(req.params.id).populate('category');

    if (!product || !product.isActive || !product.category || !product.category.isActive || product.category.isDeleted) {
      return res.status(404).render('user/product',{
        product :null,
        unavailable:true,
        relatedProducts:[]
      });
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

exports.checkProductAvailability = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (
      !product ||
      !product.isActive ||
      product.isDeleted
    ) {
      return res.json({ available: false });
    }

    return res.json({
      available: true,
      stock: product.stock,
      variants: product.variants
    });

  } catch (err) {
    res.json({ available: false });
  }
};