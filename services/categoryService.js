const Category = require('../models/categoryModel');
const fs = require('fs');
const path = require('path');

exports.getCategories = async ({ search = '', page = 1, isAdmin = false }) => {

  const limit = 5;
  const skip = (page - 1) * limit;

  const filter = {
    isDeleted: { $ne: true },
    name: { $regex: search, $options: 'i' }
  };

  if (!isAdmin) {
    filter.isActive = true;
  }

  const categoriesQuery = await Category.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'category',
        as: 'products'
      }
    },
    {
      $addFields: {
        productCount: { $size: "$products" }
      }
    },
    { $project: { products: 0 } }
  ]);

  const categories = categoriesQuery.map(c => { c.id = c._id.toString(); return c; });

  const total = await Category.countDocuments(filter);

  return {
    categories,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search
  };
};

exports.addCategory = async (data, file) => {
  
  const errors = {};

  // VALIDATE DATA
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Category name is required';
  }

  if (data.offer && (data.offer < 0 || data.offer > 99)) {
    errors.offer = 'Offer must be between 0 and 99';
  }

  // CHECK DUPLICATE
  if (data.name && data.name.trim() !== '') {
    const existing = await Category.findOne({
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' }
    });
    if (existing) {
      errors.name = 'Category already exists';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  
  if (file) {
    const filename = `cat-${Date.now()}-${file.originalname}`;
    const outputPath = path.join('public/uploads', filename);
    fs.copyFileSync(file.path, outputPath);
    fs.unlinkSync(file.path);
    data.image = `/uploads/${filename}`;
  }
  return Category.create(data);
};

exports.getCategoryById = async (id) => {
  return Category.findById(id);
};

exports.updateCategory = async (id, data, file) => {

  const errors = {};

  // VALIDATE DATA
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Category name is required';
  }

  if (data.offer && (data.offer < 0 || data.offer > 99)) {
    errors.offer = 'Offer must be between 0 and 99';
  }

  // CHECK DUPLICATE (exclude current category)
  if (data.name && data.name.trim() !== '') {
    const existing = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' }
    });
    if (existing) {
      errors.name = 'Category already exists';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }
  if (file) {
    const filename = `cat-${Date.now()}-${file.originalname}`;
    const outputPath = path.join('public/uploads', filename);
    fs.copyFileSync(file.path, outputPath);
    fs.unlinkSync(file.path);
    data.image = `/uploads/${filename}`;
  }
  return Category.findByIdAndUpdate(id, data);
};

exports.toggleCategoryStatus = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw new Error('Category not found');
  
  category.isActive = !category.isActive;
  return await category.save();
};

exports.softDeleteCategory = async (id) => {
  return Category.findByIdAndUpdate(id, { isDeleted: true });
};