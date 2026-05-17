document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', async (e) => {
    const wishlistToggle = e.target.closest('.wishlist-toggle');

    if (wishlistToggle) {
      // Prevent default and stop propagation so parent anchor/links are not triggered
      e.preventDefault();
      e.stopPropagation();

      console.log('Wishlist toggle clicked, productId:', wishlistToggle.dataset.id);

      await handleToggleWishlist(wishlistToggle.dataset.id, wishlistToggle);

      return;
    }

    const addToCartBtn = e.target.closest('.add-to-cart-btn');

    if (addToCartBtn) {
      const productId = addToCartBtn.dataset.id;
      window.location.href = `/user/product/${productId}`;
    }
  });

  async function handleToggleWishlist(productId, element) {
    try {
      console.log('Sending fetch request for toggle wishlist, productId:', productId);
      const res = await fetch('/user/wishlist/toggle', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      // Redirect if not logged in
      if (res.status === 401) {
        window.location.href = `/user/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }

      const data = await res.json();
      console.log('Fetch response received:', data);

      if (data.success) {
        showToast(
          data.message || (data.action === 'added' ? 'Added to wishlist' : 'Removed from wishlist')
        );

        // Query by .fa-heart specifically
        const icon = element.querySelector('.fa-heart');
        console.log('Icon element selected:', icon);

        if (icon) {
          if (data.action === 'added') {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
            // icon.className = 'fa-solid fa-heart';
            icon.style.color = '#b36b00';
          } else {
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular'); // Correctly set back to fa-regular when removed
            //icon.className = 'fa-regular fa-heart';
            icon.style.color = '#a0aec0';
          }
        } else {
          console.warn('Could not find .fa-heart inside .wishlist-toggle');
        }
      } else {
        showToast(data.message || 'Error updating wishlist', 'error');
      }
    } catch (err) {
      console.error('Error toggling wishlist', err);
      showToast('Something went wrong', 'error');
    }
  }

  function showToast(msg, icon = 'success') {
    Toastify({
      text: msg,
      duration: 2500,
      gravity: 'top',
      position: 'right',
      style: {
        background: icon === 'success' ? '#c26a00' : '#dc3545',
        borderRadius: '10px',
      },
    }).showToast();
  }
});
