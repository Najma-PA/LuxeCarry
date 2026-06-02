exports.validateReturnEligibility = ({ item, reason, customReason }) => {
  if (item.status !== 'Delivered') {
    return {
      success: false,
      message: 'Return not allowed for this item status',
    };
  }

  if (!item.deliveredAt) {
    return {
      success: false,
      message: 'Delivery date missing',
    };
  }

  const deliveredDate = new Date(item.deliveredAt);

  const today = new Date();

  const diffTime = today - deliveredDate;

  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays > 15) {
    return {
      success: false,
      message: 'Return period expired',
    };
  }

  if (!reason || reason.trim() === '') {
    return {
      success: false,
      message: 'Please select a return reason',
    };
  }

  let finalReason = reason.trim();

  if (reason === 'Other') {
    if (!customReason || customReason.trim() === '') {
      return {
        success: false,
        message: 'Please enter custom return reason',
      };
    }

    finalReason = customReason.trim();
  }

  return {
    success: true,
    finalReason,
  };
};
