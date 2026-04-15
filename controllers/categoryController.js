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
    console.log('--- ADD CATEGORY DEBUG ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    await categoryService.addCategory(req.body, req.file);
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
  try {
    await categoryService.updateCategory(req.params.id, req.body, req.file);
    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("There was an error updating the category: " + error.message);
  }
};

exports.deleteCategory = async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.redirect('/admin/categories');
};