const Category = require('../models/categoryModel');

exports.getCategories = async ({ search = '', page = 1 }) => {

  const limit = 5;
  const skip = (page - 1) * limit;

  const filter = {
    isActive: true,
    name: { $regex: search, $options: 'i' }
  };

  const categories = await Category.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Category.countDocuments(filter);

  return {
    categories,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search
  };
};

exports.addCategory = async (data) => {
  return Category.create(data);
};

exports.getCategoryById = async (id) => {
  return Category.findById(id);
};

exports.updateCategory = async (id, data) => {
  return Category.findByIdAndUpdate(id, data);
};

exports.deleteCategory = async (id) => {
  return Category.findByIdAndUpdate(id, { isActive: false });
};