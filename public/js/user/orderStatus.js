const orderId = '<%= order._id %>';

async function fetchOrderStatus() {
  try {
    const response = await fetch(`/user/orders/status/${orderId}`);

    const data = await response.json();

    if (data.success) {
      updateTrackingUI(data.status);
    }
  } catch (error) {
    console.log(error);
  }
}

function updateTrackingUI(status) {
  const confirmed = document.getElementById('step-confirmed');

  const shipped = document.getElementById('step-shipped');

  const out = document.getElementById('step-out');

  const delivered = document.getElementById('step-delivered');

  confirmed.classList.remove('active');
  shipped.classList.remove('active');
  out.classList.remove('active');
  delivered.classList.remove('active');

  if (['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(status)) {
    confirmed.classList.add('active');
  }

  if (['Shipped', 'Out for Delivery', 'Delivered'].includes(status)) {
    shipped.classList.add('active');
  }

  if (['Out for Delivery', 'Delivered'].includes(status)) {
    out.classList.add('active');
  }

  if (status === 'Delivered') {
    delivered.classList.add('active');
  }
}

fetchOrderStatus();

setInterval(fetchOrderStatus, 5000);
