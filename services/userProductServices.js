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

  let filter = {
    isActive: true //hide blocked products
  };

  // 🔍 SEARCH
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  //CATEGORY
  if (category) {
    filter.category = category;
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
    { "variants.value": color }
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