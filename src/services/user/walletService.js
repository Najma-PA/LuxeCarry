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
exports.getWalletTransactions = async (userId) => {
  return await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).lean();
};
