const productService = require('../services/productService');
const categoryService = require('../services/categoryService');


// 🟢 GET PRODUCTS LIST
exports.getProducts = async (req, res) => {
  try {
    const data = await productService.getProducts(req.query);

    res.render('admin/products', data);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



// 🟢 LOAD ADD PRODUCT PAGE
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



// 🟢 ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {

    // 🔥 HANDLE VARIANTS
    let variants = [];

    if (req.body.variantType) {
      variants = req.body.variantType.map((type, i) => ({
        type,
        value: req.body.variantValue[i],
        stock: req.body.variantStock[i]
      }));
    }

    await productService.addProduct(req.body, req.files, variants);

    res.redirect('/admin/products');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};



// 🟢 LOAD EDIT PAGE
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



// 🟢 UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {

    // 🔥 HANDLE VARIANTS
    let variants = [];

    if (req.body.variantType) {
      variants = req.body.variantType.map((type, i) => ({
        type,
        value: req.body.variantValue[i],
        stock: req.body.variantStock[i]
      }));
    }

    await productService.updateProduct(
      req.params.id,
      req.body,
      req.files,
      variants
    );

    res.redirect('/admin/products');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};



// 🟢 DELETE (SOFT DELETE)
exports.deleteProduct = async (req, res) => {
  try {

    await productService.deleteProduct(req.params.id);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};