exports.validateStatusTransition = (oldStatus, newStatus) => {
  const statusFlow = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

  const restrictedStatuses = ['Cancelled', 'Returned', 'Return Requested'];

  if (restrictedStatuses.includes(newStatus)) {
    throw new Error('Use approval flow for return');
  }

  const currentIndex = statusFlow.indexOf(oldStatus);
  const newIndex = statusFlow.indexOf(newStatus);

  if (newIndex !== currentIndex + 1) {
    const error = new Error(
      `Status must progress from ${statusFlow[currentIndex]} to ${statusFlow[currentIndex + 1]}`
    );
    error.statusCode = 400;
    throw error;
  }
  /*
  if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex) {
    const error = new Error('Status cannot be updated backwards');

    error.statusCode = 400;

    throw error;
  }*/
};
