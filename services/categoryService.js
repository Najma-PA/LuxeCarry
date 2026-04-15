const Category = require('../models/categoryModel');
const fs = require('fs');
const path = require('path');

exports.getCategories = async ({ search = '', page = 1 }) => {

  const limit = 5;
  const skip = (page - 1) * limit;

  const filter = {
    isActive: true,
    name: { $regex: search, $options: 'i' }
  };

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
    //CHECK DUPLICATE
  const existing = await Category.findOne({
    name: { $regex: `^${data.name}$`, $options: 'i' }
  });

  if (existing) {
    throw new Error('Category already exists');
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

    // CHECK DUPLICATE (exclude current category)
  const existing = await Category.findOne({
    _id: { $ne: id },
    name: { $regex: `^${data.name}$`, $options: 'i' }
  });

  if (existing) {
    throw new Error('Category already exists');
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

exports.deleteCategory = async (id) => {
  return Category.findByIdAndUpdate(id, { isActive: false });
};