const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    items: [
      {
        // Product Reference
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },

        // Product Snapshot
        productName: {
          type: String,
        },

        productImage: {
          type: String,
          default: '',
        },

        // Variant
        variant: {
          type: mongoose.Schema.Types.ObjectId,
        },

        variantValue: {
          type: String,
        },

        // Quantity
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        // Pricing
        price: {
          type: Number,
        },

        originalPrice: {
          type: Number,
        },

        productDiscount: {
          type: Number,
          default: 0,
        },

        finalPrice: {
          type: Number,
        },

        totalPrice: {
          type: Number,
        },

        // Item Status
        status: {
          type: String,

          enum: [
            'Pending',
            'Confirmed',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled',
            'Returned',
          ],

          default: 'Pending',
        },

        // Cancellation
        cancelReason: {
          type: String,
          default: '',
        },

        cancelledAt: {
          type: Date,
        },

        // Return
        returnReason: {
          type: String,
          default: '',
        },

        returnedAt: {
          type: Date,
        },

        // Refund
        refundAmount: {
          type: Number,
          default: 0,
        },

        refundStatus: {
          type: String,

          enum: ['Not Requested', 'Pending', 'Processed', 'Completed'],

          default: 'Not Requested',
        },

        // Delivery
        deliveredAt: {
          type: Date,
        },
      },
    ],
    /*items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
        },
        variantValue: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        status: {
          type: String,

          enum: [
            'Pending',
            'Confirmed',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled',
            'Returned',
          ],

          default: 'Pending',
        },
        cancelReason: {
          type: String,
          default: '',
        },

        returnReason: {
          type: String,
          default: '',
        },
      },
    ],*/
    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Returned',
      ],
      default: 'Pending',
    },
    /*subtotal: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },*/
    totalAmount: {
      type: Number,
      required: true,
    },

    statusHistory: [
      {
        status: {
          type: String,
        },

        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },

  {
    timestamps: true,
  }
);
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    let isUnique = false;

    while (!isUnique) {
      const random = Math.floor(1000 + Math.random() * 9000);

      const generatedOrderId = `ORD${random}`;

      const existingOrder = await mongoose.models.Order.findOne({
        orderId: generatedOrderId,
      });

      if (!existingOrder) {
        this.orderId = generatedOrderId;

        isUnique = true;
      }
    }
  }
});
module.exports = mongoose.model('Order', orderSchema);
