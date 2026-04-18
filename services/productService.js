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

  //Search
  if (search) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    
    // 1. Find categories that match search
    const Category = require('../models/categoryModel');
    const matchedCategories = await Category.find({ name: searchRegex }).select('_id');
    const categoryIds = matchedCategories.map(c => c._id);

    filter.$or = [
      { name: searchRegex },
      { category: { $in: categoryIds } }
    ];
  }

  // Status Tabs
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'archived') {
    filter.isActive = false;
  } else if (status === 'low') {
    filter.stock = { $lt: 10 };
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

const saveFile = (file) => {
  const filename = `product-${Date.now()}-${file.fieldname}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
  const outputPath = path.join('public', 'uploads', filename);
  
  if (!fs.existsSync(path.join('public', 'uploads'))) {
    fs.mkdirSync(path.join('public', 'uploads'), { recursive: true });
  }

  fs.copyFileSync(file.path, outputPath);
  fs.unlinkSync(file.path);
  return `/uploads/${filename}`;
};

exports.addProduct = async (data, files, variants) => {
  const baseImagePaths = [];
  
  // 1. Organize images by variant index
  if (files && files.length > 0) {
    files.forEach(file => {
      if (file.fieldname === 'images' || file.fieldname.startsWith('baseImage_')) {
        baseImagePaths.push(saveFile(file));
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          variants[vIdx].images.push(saveFile(file));
        }
      }
    });
  }

  const errors = {};

  if (baseImagePaths.length < 3) {
    errors.images = "Minimum 3 base images required";
  }

  // VALIDATE DATA
  if (!data.name || data.name.trim() === '') errors.name = 'Product name is required';
  if (!data.price || data.price <= 0) errors.price = 'Price must be a positive number';
  if (data.offer && (data.offer < 0 || data.offer > 99)) errors.offer = 'Offer must be between 0 and 99';
  if (!data.category) errors.category = 'Category is required';

  // CHECK DUPLICATE
  if (data.name && data.name.trim() !== '') {
    const existing = await Product.findOne({
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' }
    });
    if (existing) errors.name = 'Product with this name already exists';
  }

  // VALIDATE VARIANTS
  if (variants && variants.length > 0) {
    variants.forEach((v, idx) => {
      if (!v.type || !v.value || v.stock === undefined || v.stock === "") {
        errors[`variant_${idx}`] = 'All variant fields are required';
      } else if (v.stock < 0) {
        errors[`variant_${idx}`] = 'Variant stock cannot be negative';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  // Create Product
  return Product.create({
    name: data.name.trim(),
    category: data.category,
    price: data.price,
    offer: data.offer || 0,
    description: data.description,
    stock: calculateTotalStock(variants),
    variants,
    images: baseImagePaths,
    isActive: true
  });
};

exports.updateProduct = async (id, data, files, variants) => {
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found");

  let updatedBaseImages = [];

  // 1. Handle Existing Base Images
  if (data.existingImages) {
    updatedBaseImages = Array.isArray(data.existingImages) ? data.existingImages : [data.existingImages];
  }

  // 2. Handle New Uploads and Variant Images
  if (files && files.length > 0) {
    files.forEach(file => {
      if (file.fieldname === 'images' || file.fieldname.startsWith('baseImage_')) {
        updatedBaseImages.push(saveFile(file));
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          variants[vIdx].images.push(saveFile(file));
        }
      }
    });
  }

  // 3. Handle Existing Variant Images (passed as strings/arrays per variant)
  // We expect data.existingVariantImages_N in the request
  variants.forEach((v, i) => {
    const key = `existingVariantImages_${i}`;
    let existingVImages = [];
    if (data[key]) {
      existingVImages = Array.isArray(data[key]) ? data[key] : [data[key]];
    }
    v.images = [...(v.images || []), ...existingVImages];
  });

  const errors = {};

  if (updatedBaseImages.length < 3) {
    errors.images = "Minimum 3 base images required";
  }

  // VALIDATE DATA
  if (!data.name || data.name.trim() === '') errors.name = 'Product name is required';
  if (!data.price || data.price <= 0) errors.price = 'Price must be a positive number';
  if (data.offer && (data.offer < 0 || data.offer > 99)) errors.offer = 'Offer must be between 0 and 99';
  if (!data.category) errors.category = 'Category is required';

  // CHECK DUPLICATE (exclude current product)
  if (data.name && data.name.trim() !== '') {
    const existing = await Product.findOne({
      _id: { $ne: id },
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' }
    });
    if (existing) errors.name = 'Product with this name already exists';
  }

  // VALIDATE VARIANTS
  if (variants && variants.length > 0) {
    variants.forEach((v, idx) => {
      if (!v.type || !v.value || v.stock === undefined || v.stock === "") {
        errors[`variant_${idx}`] = 'All variant fields are required';
      } else if (v.stock < 0) {
        errors[`variant_${idx}`] = 'Variant stock cannot be negative';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  return Product.findByIdAndUpdate(id, {
    name: data.name.trim(),
    category: data.category,
    price: data.price,
    offer: data.offer,
    description: data.description,
    stock: calculateTotalStock(variants),
    variants,
    images: updatedBaseImages
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