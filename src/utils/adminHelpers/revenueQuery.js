exports.buildRevenueQuery = () => {
  return {
    items: {
      $elemMatch: {
        status: {
          $nin: ['Cancelled', 'Returned', 'Refunded', 'Return Approved'],
        },
      },
    },
  };
};
