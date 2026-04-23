const Product = require('../models/productModel');

exports.getShopProducts = async (query) => {

  let {
    search = '',
    category,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    color
  } = query;

  page = parseInt(page);
  const limit = 6;
  const skip = (page - 1) * limit;

  const Category = require('../models/categoryModel');
  const activeCategories = await Category.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');
  const activeCategoryIds = activeCategories.map(c => c._id);

  let filter = {
    isActive: true,
    category: { $in: activeCategoryIds }
  };

  // 🔍 SEARCH
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  //CATEGORY
  if (category && activeCategoryIds.some(id => id.toString() === category)) {
    filter.category = category;
  } else if (category) {
    // If category is provided but not in active list, show no products
    filter.category = null;
  }

  //PRICE
  if(minPrice || maxPrice){
    filter.price={};

    if(minPrice)filter.price.$gte= Number(minPrice);
    if(maxPrice)filter.price.$lte= Number(maxPrice);
  }
  
//COLOR FILTER 
if (color) {
  filter.$and = [
    { "variants.type": { $regex: /^color$/i } },
    { "variants.value": { $regex: new RegExp(`^${color}$`, 'i') } }
  ];
}

  // SORTING
  let sortOption = {};

  if (sort === 'low-high') sortOption.price = 1;
  if (sort === 'high-low') sortOption.price = -1;
  if (sort === 'a-z') sortOption.name = 1;
  if (sort === 'z-a') sortOption.name = -1;

  //FETCH PRODUCTS
  const products = await Product.find(filter)
    .populate('category')
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  return {
    products,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    query
  };
};