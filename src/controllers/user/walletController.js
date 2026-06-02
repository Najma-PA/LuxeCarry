const { Error } = require('mongoose');
const walletService = require('../../services/user/walletService');
exports.getWalletPage = async (req, res) => {
  try {
    const userId = req.user._id;
    let wallet = await walletService.findWalletByUserId(userId);
    if (!waller) {
      wallet = await walletService.createWallet(userId);
    }
    const transactions = await walletService.getWalletTransactions(userID);
    res.render('user/wallet', {
      user: req.user,
      wallet,
      transactions,
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
    await walletService.createWalletTransaction({
      walletId: wallet._id,
      userId,
      type: 'credit',
      transactionType,
      amount,
      description,
      orderId,
      status: 'COMPLETED',
    });
    return wallet;
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
    await walletService.createWalletTransaction({
      walletId: wallet._id,
      userId,
      type: 'debit',
      transactionType,
      amount,
      description,
      orderId,
      status: 'COMPLETED',
    });
    return wallet;
  } catch (error) {
    console.error('debit wallet error', error);
    throw error;
  }
};
