const Wallet = require('../../models/walletModel');
const WalletTransaction = require('../../models/walletTransactionModel');
//createwallet
exports.createWallet = async (userId) => {
  return await Wallet.create({ userId, balnce: 0 });
};
exports.updateWalletBalance = async (walletId, amount) => {
  return await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: amount } }, { new: true });
};
exports.createWalletTransaction = async (data) => {
  return await WalletTransaction.create(data);
};
exports.getWalletTransactions = async (userId) => {
  return (await WalletTransaction.find({ userId })).toSorted({ createdAt: -1 }).lean();
};
