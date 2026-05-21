/**
 * Calculate the correct item status dynamically based on current values.
 * 
 * @param {Object} item - Mongoose item subdocument from order.items
 * @param {string} currentStatus - Current status of the item
 * @param {string} previousStatus - Fallback previous status
 * @returns {string} - The calculated status string
 */
function calculateItemStatus(item, currentStatus, previousStatus) {
  const hasPendingCancel = item.cancelRequests && item.cancelRequests.some(r => r.status === 'Pending');
  const hasPendingReturn = item.returnRequests && item.returnRequests.some(r => r.status === 'Pending');

  if (hasPendingCancel) {
    return 'Cancellation Requested';
  }
  if (hasPendingReturn) {
    return 'Return Requested';
  }

  if (item.cancelledQty === item.quantity) {
    return 'Cancelled';
  }
  if (item.cancelledQty > 0) {
    if (item.cancelledQty + item.returnedQty === item.quantity) {
      return item.returnedQty > 0 ? 'Partially Returned' : 'Cancelled';
    }
    return 'Partially Cancelled';
  }
  if (item.returnedQty === item.quantity) {
    return 'Returned';
  }
  if (item.returnedQty > 0) {
    return 'Partially Returned';
  }

  // Revert/preserve state if it was a request but is no longer pending and has 0 cancelled/returned
  if (currentStatus === 'Cancellation Requested' || currentStatus === 'Return Requested') {
    return previousStatus || 'Pending';
  }

  return currentStatus || 'Pending';
}

/**
 * Synchronize the global orderStatus based on individual item statuses.
 * 
 * @param {Object} order - Mongoose order document
 */
function updateGlobalOrderStatus(order) {
  const allCancelled = order.items.every(i => i.status === 'Cancelled');
  const allReturned = order.items.every(i => i.status === 'Returned');
  const allCancelledOrReturned = order.items.every(i => i.status === 'Cancelled' || i.status === 'Returned');

  if (allCancelled) {
    order.orderStatus = 'Cancelled';
  } else if (allReturned) {
    order.orderStatus = 'Returned';
  } else if (allCancelledOrReturned) {
    order.orderStatus = 'Returned';
  }
}

module.exports = {
  calculateItemStatus,
  updateGlobalOrderStatus,
};
