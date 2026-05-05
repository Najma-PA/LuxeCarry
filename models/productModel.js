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

  thumbnail: {
      type: String,
      default:null
    },
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
  const pOffer = this.offer || 0;
  const cOffer = (this.category && typeof this.category === 'object') ? (this.category.offer || 0) : 0;
  const bestOffer = Math.max(pOffer, cOffer);
  return Math.round(price - (price * bestOffer / 100));
});


productSchema.virtual('displayImage').get(function () {
  if (this.thumbnail) return this.thumbnail;

  if (this.variants?.length > 0) {
    const firstVariant = this.variants[0];
    if (firstVariant.images?.length > 0) {
      return firstVariant.images[0];
    }
  }

  return '/images/placeholder.jpg';
});

// Ensure virtuals show in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });


module.exports = mongoose.model('Product', productSchema);