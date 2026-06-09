exports.calculateOrderStatus = (items) => {
  const statuses = items.map((item) => item.status);

  const activeStatuses = statuses.filter((s) => s !== 'Cancelled' && s !== 'Returned');

  if (statuses.every((s) => s === 'Cancelled')) {
    return 'Cancelled';
  }

  if (statuses.every((s) => s === 'Returned')) {
    return 'Returned';
  }

  if (activeStatuses.length === 0) {
    return 'Closed';
  }

  if (activeStatuses.every((s) => s === 'Delivered')) {
    return 'Delivered';
  }

  if (activeStatuses.every((s) => s === 'Out for Delivery')) {
    return 'Out for Delivery';
  }

  if (activeStatuses.every((s) => s === 'Shipped')) {
    return 'Shipped';
  }

  if (activeStatuses.every((s) => s === 'Confirmed')) {
    return 'Confirmed';
  }

  if (activeStatuses.every((s) => s === 'Pending')) {
    return 'Pending';
  }

  if (activeStatuses.includes('Delivered')) {
    return 'Partially Delivered';
  }

  if (activeStatuses.includes('Out for Delivery')) {
    return 'Partially Out for Delivery';
  }

  if (activeStatuses.includes('Shipped')) {
    return 'Partially Shipped';
  }

  if (activeStatuses.includes('Confirmed')) {
    return 'Partially Confirmed';
  }
  if (activeStatuses.incluldes('Pending')) {
    return 'Partially Pending';
  }
  return 'Pending';
};
