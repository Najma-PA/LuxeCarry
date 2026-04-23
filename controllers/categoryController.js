const categoryService = require('../services/categoryService');

exports.getCategories = async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const data = await categoryService.getCategories({ ...req.query, status, isAdmin: true });

    // Detect AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      const tableHtml = await new Promise((resolve, reject) => {
        res.render('partials/admin/category-table', { ...data, status }, (err, html) => {
          if (err) reject(err); else resolve(html);
        });
      });

      return res.json({
        success: true,
        tableHtml,
        currentPage: data.currentPage,
        totalPages: data.totalPages
      });
    }

    res.render('admin/categories', { ...data, status });
  } catch (err) {
    res.send(err.message);
  }
};

exports.loadAddPage = (req, res) => {
  res.render('admin/addCategory');
};

exports.addCategory = async (req, res) => {
  try {
    await categoryService.addCategory(req.body, req.file);
    res.json({ success: true, message: 'Category added successfully', redirectUrl: '/admin/categories' });
  } catch (err) {
    console.error(err);
    if (err.isValidationError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.loadEditPage = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) {
      return res.redirect('/admin/categories');
    }
    res.render('admin/editCategory', { category });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    await categoryService.updateCategory(req.params.id, req.body, req.file);
    res.json({ success: true, message: 'Category updated successfully', redirectUrl: '/admin/categories' });
  } catch (error) {
    console.error("Error updating category:", error);
    if (error.isValidationError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.toggleCategoryStatus = async (req, res) => {
  try {
    await categoryService.toggleCategoryStatus(req.params.id);
    res.json({ success: true, message: 'Category status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update category status' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await categoryService.softDeleteCategory(req.params.id);
    res.json({ success: true, message: 'Category archived successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to archive category' });
  }
};

exports.restoreCategory = async (req, res) => {
  try {
    await categoryService.restoreCategory(req.params.id);
    res.json({ success: true, message: 'Category restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to restore category' });
  }
};