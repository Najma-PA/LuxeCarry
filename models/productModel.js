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
  },
  images: [
    {
      type: String
    }
  ]
}, { _id: true });


// PRODUCT SCHEMA
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
    type: Number, 
    default: 0
  },

  stock: {
    type: Number,
    default: 0
  },

  variants: [variantSchema],

  images: [
    {
      type: String 
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});


// VIRTUAL FIELD 
productSchema.virtual('finalPrice').get(function () {
  const price = this.price || 0;
  const offer = this.offer || 0;
  return Math.round(price - (price * offer / 100));
});


// Ensure virtuals show in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });


module.exports = mongoose.model('Product', productSchema);