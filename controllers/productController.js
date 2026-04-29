const productService = require('../services/productService');
const categoryService = require('../services/categoryService');


// GET PRODUCTS LIST
exports.getProducts = async (req, res) => {
  try {
    const data = await productService.getProducts(req.query);

    // Detect AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const tableHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/product-table', { ...data }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      const paginationHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/pagination', { ...data }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      return res.json({
        success: true,
        tableHtml,
        paginationHtml,
        currentPage: data.currentPage,
        totalPages: data.totalPages
      });
    }

    res.render('admin/products', data);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



// LOAD ADD PRODUCT PAGE
exports.loadAddPage = async (req, res) => {
  try {
    const categories = await categoryService.getCategories({});

    res.render('admin/addProduct', {
      categories: categories.categories // because service returns object
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
};



// ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {

    // HANDLE VARIANTS
    let variants = [];

    if (req.body.variantType) {
      variants = req.body.variantType.map((type, i) => ({
        //_id:new 
        type,
        value: req.body.variantValue[i],
        stock: req.body.variantStock[i]
      }));
    }

    await productService.addProduct(req.body, req.files, variants);
    res.json({ success: true, message: 'Product added', redirectUrl: '/admin/products' });

  } catch (err) {
    console.error(err);
    if (err.isValidationError) {
      return res.json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};



// LOAD EDIT PAGE
exports.loadEditPage = async (req, res) => {
  try {

    const product = await productService.getProductById(req.params.id);
    const categories = await categoryService.getCategories({});

    if (!product) {
      return res.redirect('/admin/products');
    }

    res.render('admin/editProduct', {
      product,
      categories: categories.categories
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
};



// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {

    // HANDLE VARIANTS
    let variants = [];

    if (req.body.variantType) {
      variants = req.body.variantType.map((type, i) => {
        const variantObj = {
          type,
          value: req.body.variantValue[i],
          stock: req.body.variantStock[i]
        };
        // Preserve existing _id so it doesn't get orphaned in user carts
        if (req.body.variantId && req.body.variantId[i]) {
          variantObj._id = req.body.variantId[i];
        }
        return variantObj;
      });
    }

    await productService.updateProduct(
      req.params.id,
      req.body,
      req.files,
      variants
    );

    res.json({ success: true, message: 'Product updated', redirectUrl: '/admin/products' });

  } catch (err) {
    console.error(err);
    if (err.isValidationError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};



// DELETE (SOFT DELETE)
exports.deleteProduct = async (req, res) => {
  try {

    await productService.deleteProduct(req.params.id);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during deletion' });
  }
};



// RESTORE
exports.restoreProduct = async (req, res) => {
  try {
    await productService.restoreProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Restoration Failed:', err.message);
    res.status(500).json({ success: false, message: 'Server error during restoration: ' + err.message });
  }
};