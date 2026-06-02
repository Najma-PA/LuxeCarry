const Product = require('../../models/productModel');

const restoreStock = async (item) => {
  if (item.variant) {
    await Product.updateOne(
      {
        _id: item.product,
        'variants._id': item.variant,
      },
      {
        $inc: {
          stock: item.quantity,
          'variants.$.stock': item.quantity,
        },
      }
    );
  } else {
    await Product.updateOne(
      {
        _id: item.product,
      },
      {
        $inc: {
          stock: item.quantity,
        },
      }
    );
  }
};
module.exports = restoreStock;
