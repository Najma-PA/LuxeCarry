const categoryService = require('../services/categoryService');

exports.getCategories = async (req, res) => {
  try {
    const data = await categoryService.getCategories(req.query);
    res.render('admin/categories', data);
  } catch (err) {
    res.send(err.message);
  }
};

exports.loadAddPage = (req, res) => {
  res.render('admin/addCategory');
};

exports.addCategory = async (req, res) => {
  try {
    await categoryService.addCategory(req.body);
    res.redirect('/admin/categories');
  } catch (err) {
    res.send(err.message);
  }
};

exports.loadEditPage = async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.render('admin/editCategory', { category });
};

exports.updateCategory = async (req, res) => {
  await categoryService.updateCategory(req.params.id, req.body);
  res.redirect('/admin/categories');
};

exports.deleteCategory = async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.redirect('/admin/categories');
};