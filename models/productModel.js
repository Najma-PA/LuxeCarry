const mongoose = require('mongoose');


// 🔹 VARIANT SCHEMA (Subdocument)
const variantSchema = new mongoose.Schema({
  type: {
    type: String, // e.g., Color, Size
    required: true
  },
  value: {
    type: String, // e.g., Black, XL
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });


// 🔹 PRODUCT SCHEMA
const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ''
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  offer: {
    type: Number, // percentage (e.g., 20%)
    default: 0
  },

  stock: {
    type: Number,
    default: 0
  },

  variants: [variantSchema],

  images: [
    {
      type: String // image path
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});


// 🔥 VIRTUAL FIELD (DISCOUNTED PRICE)
productSchema.virtual('finalPrice').get(function () {
  return this.price - (this.price * this.offer / 100);
});


// 🔥 OPTIONAL: Ensure virtuals show in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });


module.exports = mongoose.model('Product', productSchema);