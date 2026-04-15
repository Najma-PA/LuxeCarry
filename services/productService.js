const Product = require('../models/productModel');
//const sharp = require('sharp');
const path = require('path');
const fs = require('fs');


//GET PRODUCTS (Search + Pagination + Tabs)
exports.getProducts = async (query) => {

  let {
    search = '',
    page = 1,
    status = 'all'
  } = query;

  page = parseInt(page);
  const limit = 5;
  const skip = (page - 1) * limit;

  let filter = {};

  // 🔍 Search
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  //Status Tabs
  if (status === 'active') {
    filter.isActive = true;
  }

  if (status === 'archived') {
    filter.isActive = false;
  }

  if (status === 'low') {
    filter.stock = { $lt: 10 };
  }

  // Default
  if (status === 'all') {
    filter = {};
  }

  const products = await Product.find(filter)
    .populate('category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search,
    status
  };
};

exports.addProduct = async (data, files, variants) => {
  // VALIDATION
  if (!files || files.length < 3) {
    throw new Error("Minimum 3 images required");
  }

  const imagePaths = [];

  for (let file of files) {

    const filename = `product-${Date.now()}-${file.originalname}`;
    const outputPath = path.join('public/uploads', filename);

    // Copy file
    fs.copyFileSync(file.path, outputPath);

    imagePaths.push(`/uploads/${filename}`);

    // delete temp file
    fs.unlinkSync(file.path);
  }

  // Create Product
  return Product.create({
    name: data.name,
    category: data.category,
    price: data.price,
    offer: data.offer || 0,
    description: data.description,
    stock: calculateTotalStock(variants),
    variants,
    images: imagePaths,
    isActive: true
  });
};

exports.updateProduct = async (id, data, files, variants) => {

  const product = await Product.findById(id);

  if (!product) throw new Error("Product not found");

  let updatedImages = product.images;
  // If new images uploaded
  if (files && files.length > 0) {
    if (files.length < 3) {
      throw new Error("Minimum 3 images required");
    }

    const newImages = [];

    for (let file of files) {

      const filename = `product-${Date.now()}-${file.originalname}`;
      const outputPath = path.join('public/uploads', filename);

      fs.copyFileSync(file.path, outputPath);

      newImages.push(`/uploads/${filename}`);

      fs.unlinkSync(file.path);
    }

    updatedImages = newImages;
  }
  return Product.findByIdAndUpdate(id, {
    name: data.name,
    category: data.category,
    price: data.price,
    offer: data.offer,
    description: data.description,
    stock: calculateTotalStock(variants),
    variants,
    images: updatedImages
  });
};

exports.getProductById = async (id) => {
  return Product.findById(id).populate('category');
};

exports.deleteProduct = async (id) => {
  return Product.findByIdAndUpdate(id, { isActive: false });
};

function calculateTotalStock(variants) {

  if (!variants || variants.length === 0) return 0;

  return variants.reduce((total, v) => {
    return total + parseInt(v.stock || 0);
  }, 0);
}