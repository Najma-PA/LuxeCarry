const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    transactionType: {
      type: String,

      enum: [
        'REFERRAL',
        'ORDER_PAYMENT',
        'ORDER_REFUND',
        'RETURN_REFUND',
        'TOPUP',
        'PURCHASE',
        'ADMIN_CREDIT',
        'ADMIN_DEBIT',
      ],

      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },

    status: {
      type: String,
      default: 'COMPLETED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
