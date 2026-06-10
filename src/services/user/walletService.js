const Wallet = require('../../models/walletModel');
const WalletTransaction = require('../../models/walletTransactionModel');
//createwallet
exports.createWallet = async (userId) => {
  return await Wallet.create({ userId, balance: 0 });
};
exports.findWalletByUserId = async (userId) => {
  return await Wallet.findOne({ userId });
};
exports.updateWalletBalance = async (walletId, amount) => {
  return await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: amount } }, { new: true });
};
exports.createWalletTransaction = async (data) => {
  return await WalletTransaction.create(data);
};
exports.getWalletTransactions = async (userId, limit = 5) => {
  let query = WalletTransaction.find({ userId }).sort({ createdAt: -1 });
  if (limit > 0) {
    query.limit(limit);
  }
  return await query.lean();
};
exports.getTransactionCount = async (userId) => {
  return await WalletTransaction.countDocuments({
    userId,
  });
};
