const Product = require('../models/productModel');
const path = require('path');
const fs = require('fs');

//calculate total stock
function calculateTotalStock(variants){
  if(!variants || variants.length===0)return 0;
  return variants.reduce((total,v)=>total+ parseInt(v.stock || 0),0)
}

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
    filter.isActive = true;
    // Check both variant stock and base product stock (for legacy products without variants)
    // Use $and to prevent overwriting the search $or filter
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'variants.stock': { $lt: 5 } },
        { stock: { $lt: 5 } }
      ]
    });
  }

  const products = await Product.find(filter)
    .populate('category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  // DASHBOARD STATS CALCULATION
  const allActiveProducts = await Product.find({ isActive: true });
  
  let totalSKUs = 0;
  let lowStockCount = 0;
  let inventoryValue = 0;

  allActiveProducts.forEach(p => {
    totalSKUs += p.variants.length;

    p.variants.forEach(v =>{
      if(v.stock < 5) lowStockCount++;
      inventoryValue += (p.price * v.stock);
    });
  });
    /*if (p.variants && p.variants.length > 0) {
      // If product has variants, count each as an SKU
     // totalSKUs += p.variants.length;
      //p.variants.forEach(v => {
        //if (v.stock < 5) lowStockCount++;
        //inventoryValue += (p.price * v.stock);
      });
    } else {
      // Base product as 1 SKU
      totalSKUs += 1;
      if (p.stock < 5) lowStockCount++;
      inventoryValue += (p.price * p.stock);
    }
  });
*/
  return {
    products,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    search,
    status,
    totalSKUs,
    lowStockCount,
    inventoryValue
  };
};

//File save
const saveFile = async (file) => {
  const filename = `product-${Date.now()}-${file.fieldname}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
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

exports.addProduct = async (data, files, variants) => {
  const baseImagePaths = [];
  
  // save files
  if(files && files.length > 0){
    const savePromises = files.map(async(file)=> {
      if(file.fieldname.startsWith('variantImages_')){
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if(variants[vIdx]){
          if(!variants[vIdx].images) variants[vIdx].images = [];
          const savedPath = await saveFile(file);
          variants[vIdx].images.push(savedPath);
        }
      }else{
        const savedPath = await saveFile(file);
        baseImagePaths.push(savedPath);
      }
    });
    await Promise.all(savePromises);
  }

 /* if (baseImagePaths.length === 0 && variants.length > 0) {
  baseImagePaths.push(...(variants[0].images || []));
}
*/
  //ensuse at leasrt one variant
  if(!variants || variants.length ===0){
    variants =[{
      type:"Default",
      value:"Default",
      stock:parseInt(data.stock || 0),
      images: baseImagePaths
    }];
  }

  /*if (files && files.length > 0) {
    const savePromises = files.map(async (file) => {
      if (file.fieldname.startsWith('variantImages_')) {
        
        const savedPath = await saveFile(file);
        baseImagePaths.push(savedPath);
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          const savedPath = await saveFile(file);
          variants[vIdx].images.push(savedPath);
        }
      }
    });
    await Promise.all(savePromises);
  }
*/
  const errors = {};

  const totalImages = baseImagePaths.length + variants.reduce((sum, v) => {
  return sum + (v.images ? v.images.length : 0);
}, 0);

if (totalImages < 3) {
  errors.images = "Minimum 3 images required";
}
  /*if (baseImagePaths.length < 3) {
    errors.images = "Minimum 3 base images required";
  }
*/
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
  if(variants && variants.length >0){
     variants.forEach((v,idx) =>{
    if(!v.type || !v.value || v.stock === undefined || v.stock ===""){
      errors[`variant_${idx}`] = 'variant fields required';
    } else if (v.stock < 0){
      errors[`variant_${idx}`] ='Stock cannot be negative';
    }
  });

  }
 
  /*if (variants && variants.length > 0) {
    variants.forEach((v, idx) => {
      if (!v.type || !v.value || v.stock === undefined || v.stock === "") {
        errors[`variant_${idx}`] = 'All variant fields are required';
      } else if (v.stock < 0) {
        errors[`variant_${idx}`] = 'Variant stock cannot be negative';
      }
    });
  }
*/
  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  // Create Product
   const totalStock = calculateTotalStock(variants);  
  return Product.create({
    name: data.name.trim(),
    category: data.category,
    price: data.price,
    offer: data.offer || 0,
    description: data.description,
    stock: totalStock,
    variants,
    images: baseImagePaths,
    isActive: true
  });
};

//update product

exports.updateProduct = async (id, data, files, variants) => {
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found");

  let updatedBaseImages = [];

  // Handle Existing Base Images
  if (data.existingImages) {
    updatedBaseImages = Array.isArray(data.existingImages) ? data.existingImages : [data.existingImages];
  }

  // save file
   if (files && files.length > 0) {
    const savePromises = files.map(async (file) => {
      if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          const savedPath = await saveFile(file);
          variants[vIdx].images.push(savedPath);
        }
      } else {
        const savedPath = await saveFile(file);
        updatedBaseImages.push(savedPath);
      }
    });
    await Promise.all(savePromises);
  }
  /*if (files && files.length > 0) {
    const savePromises = files.map(async (file) => {
      if (file.fieldname === 'images' || file.fieldname.startsWith('baseImage_')) {
        const savedPath = await saveFile(file);
        updatedBaseImages.push(savedPath);
      } else if (file.fieldname.startsWith('variantImages_')) {
        const vIdx = parseInt(file.fieldname.split('_')[1]);
        if (variants[vIdx]) {
          if (!variants[vIdx].images) variants[vIdx].images = [];
          const savedPath = await saveFile(file);
          variants[vIdx].images.push(savedPath);
        }
      }
    });
    await Promise.all(savePromises);
  }
*/
  // 3. Handle Existing Variant Images (passed as strings/arrays per variant)
  // We expect data.existingVariantImages_N in the request
 /* variants.forEach((v, i) => {
    const key = `existingVariantImages_${i}`;
    let existingVImages = [];
    if (data[key]) {
      existingVImages = Array.isArray(data[key]) ? data[key] : [data[key]];
    }
    v.images = [...(v.images || []), ...existingVImages];
  });
*/
  const errors = {};

//existing variant images
if(variants && variants.length > 0){
  variants.forEach((v,i)=>{
    const key = `existingVariantImages_${i}`;
    if(data[key]){
      const existing =Array.isArray(data[key]) ? data[key]:[data[key]];
      v.images =[...(v.images || []), ...existing];
    }
  });

}

if (updatedBaseImages.length === 0 && variants && variants.length > 0) {
  updatedBaseImages.push(...(variants[0].images || []));
}

//ensure variant
if(!variants || variants.length ===0){
  variants =[{
    type: "Default",
    value: "Default",
    stock:parseInt(data.stock || 0),
    images: updatedBaseImages
  }]
}

const totalImages = updatedBaseImages.length + variants.reduce((sum, v) => {
  return sum + (v.images ? v.images.length : 0);
}, 0);

if (totalImages < 3) {
  errors.images = "Minimum 3 images required";
}
/*
  if (updatedBaseImages.length < 3) {
    errors.images = "Minimum 3 base images required";
  }
*/
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
  if(variants && variants.length >0){
    variants.forEach((v, idx) => {
    if (!v.type || !v.value || v.stock === undefined || v.stock === "") {
      errors[`variant_${idx}`] = 'Variant fields required';
    } else if (v.stock < 0) {
      errors[`variant_${idx}`] = 'Stock cannot be negative';
    }
  });
  }
   
  /*if (variants && variants.length > 0) {
    variants.forEach((v, idx) => {
      if (!v.type || !v.value || v.stock === undefined || v.stock === "") {
        errors[`variant_${idx}`] = 'All variant fields are required';
      } else if (v.stock < 0) {
        errors[`variant_${idx}`] = 'Variant stock cannot be negative';
      }
    });
  }
*/
  if (Object.keys(errors).length > 0) {
    throw { isValidationError: true, errors };
  }

  const totalStock = calculateTotalStock(variants);

  return Product.findByIdAndUpdate(id, {
    name: data.name.trim(),
    category: data.category,
    price: data.price,
    offer: data.offer || 0,
    description: data.description,
    stock: totalStock,
    variants,
    images: updatedBaseImages
  });
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

  