const Product = require('../../models/productModel');
const path = require('path');
const fs = require('fs');

const { uploadStream } = require('../../utils/cloudinaryHelper');
const { deleteImage } = require('../../utils/cloudinaryHelper');

function calculateTotalStock(variants) {
  if (!variants || variants.length === 0) return 0;
  return variants.reduce((total, v) => total + parseInt(v.stock || 0), 0);
}

exports.getProducts = async (query) => {
  let { search = '', page = 1, status = 'all' } = query;

  page = parseInt(page);
  const limit = 5;
  const skip = (page - 1) * limit;

  let filter = {};

  //Search
  if (search) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };

    const Category = require('../../models/categoryModel');
    const matchedCategories = await Category.find({ name: searchRegex }).select('_id');
    const categoryIds = matchedCategories.map((c) => c._id);

    filter.$or = [{ name: searchRegex }, { category: { $in: categoryIds } }];
  }

  // Status Tabs
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'archived') {
    filter.isActive = false;
  } else if (status === 'low') {
    filter.isActive = true;

    // Use $and to prevent overwriting the search $or filter
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ 'variants.stock': { $lt: 5 } }, { stock: { $lt: 5 } }],
    });
  }

  const products = await Product.find(filter)
    .populate('category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  const allActiveProducts = await Product.find({ isActive: true });

  let totalSKUs = 0;
  let lowStockCount = 0;
  let inventoryValue = 0;

  allActiveProducts.forEach((p) => {
    if (!p) return;
    const variants = Array.isArray(p.variants) ? p.variants : [];

    totalSKUs += variants.length;

    variants.forEach((v) => {
      if (!v || typeof v.stock !== 'number') return;
      if (v.stock < 5) lowStockCount++;

      const price = typeof p.price === 'number' ? p.price : 0;
      inventoryValue += price * v.stock;
    });
  });

  return {
    products,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search,
    status,
    totalSKUs,
    lowStockCount,
    inventoryValue,
  };
};
/*
//File save
const saveFile = async (file) => {
  const filename = `product-${Date.now()}-${file.fieldname}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
  const uploadDir = path.join('public', 'uploads');
  const outputPath = path.join(uploadDir, filename);

  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  try {
    await fs.promises.rename(file.path, outputPath);
  } catch (err) {
    // Fallback if cross-device rename fails
    await fs.promises.copyFile(file.path, outputPath);
    await fs.promises.unlink(file.path);
  }

  return `/uploads/${filename}`;
};
*/
exports.addProduct = async (data, files, variants) => {
  variants = variants || [];
  let thumbnail = null;
  let allFiles = [];

  if (files) {
    allFiles = Array.isArray(files) ? files : Object.values(files).flat();
  }
  if (allFiles.length > 0) {
    const uploadPromises = allFiles.map(async (file) => {
      const result = await uploadStream(file.buffer, 'products');
      if (file.fieldname === 'thumbnail') {
        thumbnail = result;
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants && variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          variants[vIdx].images.push({
            url: result.url,
            public_id: result.public_id,
          });
        }
      }
    });
    await global.Promise.all(uploadPromises);
  }

  //ensure at least one variant
  if (!variants || variants.length === 0) {
    variants = [
      {
        type: 'Default',
        value: 'Default',
        stock: parseInt(data.stock || 0),
        images: [],
      },
    ];
  }

  const errors = {};
  // VALIDATE DATA
  if (!data.name || data.name.trim() === '') errors.name = 'Product name is required';
  if (!data.price || data.price <= 0) errors.price = 'Price must be a positive number';
  if (data.offer && (data.offer < 0 || data.offer > 99))
    errors.offer = 'Offer must be between 0 and 99';
  if (!data.category) errors.category = 'Category is required';

  // CHECK DUPLICATE
  if (data.name && data.name.trim() !== '') {
    const existing = await Product.findOne({
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' },
    });
    if (existing) errors.name = 'Product with this name already exists';
  }

  // VALIDATE VARIANTS
  const seen = new Set();
  variants.forEach((v, idx) => {
    if (!v.type || !v.value || v.stock === undefined || v.stock === '') {
      errors[`variant_${idx}`] = 'variant fields required';
    } else if (v.stock < 0) {
      errors[`variant_${idx}`] = 'Stock cannot be negative';
    }

    if (!v.images || v.images.length < 3) {
      errors[`variant_image_${idx}`] = 'Each variant must have at least 3 images ';
    }

    const key = `${v.type}-${v.value}`;
    if (seen.has(key)) {
      errors[`variant_duplicate_${idx}`] = `Duplicate variant:${key}`;
    }
    seen.add(key);
  });

  if (Object.keys(errors).length > 0) {
    // Cleanup newly uploaded images if validation fails
    if (thumbnail) await deleteImage(thumbnail.public_id);
    for (const v of variants) {
      if (v.images) {
        for (const img of v.images) await deleteImage(img.public_id);
      }
    }
    throw { isValidationError: true, errors };
  }

  if (!thumbnail && variants?.length > 0 && variants[0]?.images?.length > 0) {
    thumbnail = {
      url: variants[0].images[0].url,
      public_id: variants[0].images[0].public_id,
    };
  }
  const totalStock = calculateTotalStock(variants);

  //create product
  return Product.create({
    name: data.name.trim(),
    category: data.category,
    price: Number(data.price) || 0,
    offer: data.offer || 0,
    description: data.description,
    stock: totalStock,
    variants,
    thumbnail,
    isActive: true,
  });
};

//updateProduct

exports.updateProduct = async (id, data, files, variants) => {
  const product = await Product.findById(id);
  if (!product) throw new Error('Product not found');

  let newThumbnail = null;

  let allFiles = [];

  if (files) {
    allFiles = Array.isArray(files) ? files : Object.values(files).flat();
  }
  if (allFiles.length > 0) {
    const uploadPromises = allFiles.map(async (file) => {
      const result = await uploadStream(file.buffer, 'products');
      if (file.fieldname === 'thumbnail') {
        newThumbnail = result;
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);

        if (variants && variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];

          variants[vIdx].images.push({ url: result.url, public_id: result.public_id });
        }
      }
    });

    await global.Promise.all(uploadPromises);
  }

  //merge existing images
  // Handle existing images and deleted images
  if (variants && variants.length > 0) {
    for (const [i, v] of variants.entries()) {
      const existingKey = `existingVariantImages_${i}`;
      const deletedKey = `deletedVariantImages_${i}`;

      let currentImages = [];

      // Parse existing images
      if (data[existingKey]) {
        const existing = Array.isArray(data[existingKey]) ? data[existingKey] : [data[existingKey]];

        currentImages = existing
          .map((img) => {
            if (!img) return null;
            try {
              const parsed = typeof img === 'string' ? JSON.parse(img) : img;
              if (parsed && typeof parsed === 'object' && (parsed.url || parsed.public_id)) {
                return { url: parsed.url, public_id: parsed.public_id };
              }
              return null;
            } catch (e) {
              console.error('Error parsing existing image:', e);
              return null;
            }
          })
          .filter((img) => img !== null);
      }

      // Identify images to delete
      if (data[deletedKey]) {
        const deleted = Array.isArray(data[deletedKey]) ? data[deletedKey] : [data[deletedKey]];
        for (const imgJson of deleted) {
          if (!imgJson) continue;
          try {
            const img = typeof imgJson === 'string' ? JSON.parse(imgJson) : imgJson;
            if (img && img.public_id) {
              await deleteImage(img.public_id);
            }
          } catch (e) {
            console.error('Error deleting image:', e);
          }
        }
      }

      v.images = [...currentImages, ...(v.images || [])];
    }
  }

  // Ensure at least one variant
  if (!variants || variants.length === 0) {
    variants = [
      {
        type: 'Default',
        value: 'Default',
        stock: Number(data.stock) || 0,
        images: [],
      },
    ];
  }

  const errors = {};

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Product name is required';
  }
  if (!data.price || data.price <= 0) {
    errors.price = 'Price must be a positive number';
  }
  if (data.offer && (data.offer < 0 || data.offer > 99)) {
    errors.offer = 'Offer must be between 0 and 99';
  }
  if (!data.category) {
    errors.category = 'Category is required';
  }

  if (data.name && data.name.trim() !== '') {
    const existing = await Product.findOne({
      _id: { $ne: id },
      name: { $regex: `^${data.name.trim()}$`, $options: 'i' },
    });

    if (existing) {
      errors.name = 'Product with this name already exists';
    }
  }

  //validate variants
  const seen = new Set();

  variants.forEach((v, idx) => {
    if (!v.type || !v.value || v.stock === undefined || v.stock === '') {
      errors[`variant_${idx}`] = 'variant fields required';
    } else if (v.stock < 0) {
      errors[`variant_${idx}`] = 'Stock cannot be negative';
    }
    if (!v.images || v.images.length < 3) {
      errors[`variant_image_${idx}`] = 'Each variant must have at least 3 images ';
    }

    const key = `${v.type}-${v.value}`;
    if (seen.has(key)) {
      errors[`variant_duplicate_${idx}`] = `Duplicate variant:${key}`;
    }
    seen.add(key);
  });

  //\Stops if validation fails
  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  //handle thumbnail

  let thumbnail = product.thumbnail;
  if (newThumbnail) {
    if (product.thumbnail && product.thumbnail.public_id) {
      await deleteImage(product.thumbnail.public_id);
    }
    thumbnail = newThumbnail;
  }

  if (!thumbnail && variants.length > 0 && variants[0].images.length > 0) {
    thumbnail = {
      url: variants[0].images[0].url,
      public_id: variants[0].images[0].public_id,
    };
  }
  const totalStock = calculateTotalStock(variants);

  return Product.findByIdAndUpdate(
    id,
    {
      name: data.name.trim(),
      category: data.category,
      price: Number(data.price) || 0,
      offer: data.offer || 0,
      description: data.description,
      stock: totalStock,
      variants,
      thumbnail,
    },
    { new: true }
  );
};

//get product
exports.getProductById = async (id) => {
  return Product.findById(id).populate('category');
};
//delete product
exports.deleteProduct = async (id) => {
  return Product.findByIdAndUpdate(id, { isActive: false });
};

//restore product
exports.restoreProduct = async (id) => {
  try {
    console.log('--- ProductService.restoreProduct ---');
    console.log('ID:', id);
    const updated = await Product.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!updated) {
      console.log('Result: Product not found');
      throw new Error('Product not found in database');
    }
    console.log('Result: Success');
    return updated;
  } catch (err) {
    console.error('Error in ProductService.restoreProduct:', err.message);
    throw err;
  }
};
