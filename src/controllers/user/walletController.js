//const { Error } = require('mongoose');
const walletService = require('../../services/user/walletService');
//const walletTransaction = require('../../models/walletTransactionModel');
exports.getWalletPage = async (req, res) => {
  try {
    const userId = req.user._id;
    let wallet = await walletService.findWalletByUserId(userId);
    if (!wallet) {
      wallet = await walletService.createWallet(userId);
    }
    const isViewAll = req.query.view === 'all';
    const transactions = await walletService.getWalletTransactions(userId, isViewAll ? 0 : 5);
    const totalTransactions = await walletService.getTransactionCount(userId);
    res.render('user/wallet', {
      user: req.user,
      wallet,
      transactions,
      totalTransactions,
      isViewAll,
      activePage: 'wallet',
    });
  } catch (error) {
    console.error('Wallet Page Error', error);
    res.redirect('/pageNotFound');
  }
};
exports.creditWallet = async ({ userId, amount, transactionType, description, orderId = null }) => {
  try {
    let wallet = await walletService.findWalletByUserId(userId);
    if (!wallet) {
      wallet = await walletService.createWallet(userId);
    }
    wallet = await walletService.updateWalletBalance(wallet._id, amount);
    const transaction = await walletService.createWalletTransaction({
      walletId: wallet._id,
      userId,
      type: 'credit',
      transactionType,
      amount,
      description,
      orderId,
      status: 'COMPLETED',
    });
    return { wallet, transaction };
  } catch (error) {
    console.error('Credit wallet error', error);
    throw error;
  }
};
exports.debitWallet = async ({ userId, amount, transactionType, description, orderId = null }) => {
  try {
    let wallet = await walletService.findWalletByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    wallet = await walletService.updateWalletBalance(wallet._id, -amount);
    const transaction = await walletService.createWalletTransaction({
      walletId: wallet._id,
      userId,
      type: 'debit',
      transactionType,
      amount,
      description,
      orderId,
      status: 'COMPLETED',
    });
    return { wallet, transaction };
  } catch (error) {
    console.error('debit wallet error', error);
    throw error;
  }
};
