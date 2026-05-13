
let isProductAvailable = true;

function autoSelectVariant() {
  if (!product.variants || product.variants.length === 0) return;

  let firstAvailable = product.variants.find((v) => v.stock > 0);
  if (!firstAvailable) {
    firstAvailable = product.variants[0];
  }

  if (firstAvailable.type === 'Color') {
    selectedColor = firstAvailable.value;
  } else {
    selectedSize = firstAvailable.value;
  }

  // clear old active
  document.querySelectorAll('.color-swatch, .size-chip').forEach((el) => {
    el.classList.remove('active');
  });

  // activate correct UI
  const el = document.querySelector(
    `[data-color="${firstAvailable.value}"], [data-size="${firstAvailable.value}"]`
  );
  if (el) el.classList.add('active');

  // update images
  const fallbackImages = product.variants?.[0]?.images || (product.thumbnail ? [product.thumbnail] : []);

  swapGallery(fallbackImages);

  if (isProductAvailable) {
    updateStockDisplay();
  }
}

function disableOutOfStockVariants() {
  if (!product.variants) return;

  product.variants.forEach((v) => {
    if (v.stock <= 0) {
      const el = document.querySelector(`[data-color="${v.value}"], [data-size="${v.value}"]`);
      if (el) {
        el.classList.add('disabled');
        el.style.opacity = '0.4';
      }
    }
  });
}
let selectedColor = '';
let selectedSize = '';
let quantity = 1;

function updateCartBadge(count) {
  const badge = document.getElementById('cart-count-badge');
  if (badge) {
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

window.onload = () => {
  disableOutOfStockVariants();
  autoSelectVariant();
  updateStockDisplay();
  initZoom();

  setInterval(checkAvailabilityLive, 3000);
};

function initZoom() {
  const container = document.getElementById('mainImgContainer');
  const img = document.getElementById('mainDisplayImg');

  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    img.style.transformOrigin = `${x}% ${y}%`;
  });

  container.addEventListener('mouseenter', () => {
    container.classList.add('zoomed');
  });

  container.addEventListener('mouseleave', () => {
    container.classList.remove('zoomed');
    img.style.transformOrigin = 'center center';
  });
}

function selectColor(el, color) {
  selectedColor = color;

  document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');

  const variant = product.variants.find((v) => v.variantType === 'Color' && v.value === color);

  if (variant && variant.images && variant.images.length > 0) {
    swapGallery(variant.images);
  } else {
    const fallbackImages = product.variants?.[0]?.images || (product.thumbnail.url ? [product.thumbnail] : []);

    swapGallery(fallbackImages);
  }

  if (isProductAvailable) {
    updateStockDisplay();
  }

  updateTitle();
}

function updateMainImage(el, src) {
  document.getElementById('mainDisplayImg').src = src;
  document.querySelectorAll('.thumbnail-item').forEach((t) => t.classList.remove('active'));
  el.classList.add('active');
}

function swapGallery(images) {
  const mainImg = document.getElementById('mainDisplayImg');
  const thumbContainer = document.getElementById('thumbContainer');

  if (!images || images.length === 0) {
    mainImg.src = product.thumbnail.url || '/img/placeholder.jpg';
    thumbContainer.innerHTML = '';
    return;
  }

  mainImg.src = images[0];

  let html = '';
  images.forEach((img, idx) => {
    html += `
      <div class="thumbnail-item ${idx === 0 ? 'active' : ''}" 
           onclick="updateMainImage(this, '${img}')">
        <img src="${img}" alt="Thumbnail">
      </div>
    `;
  });

  thumbContainer.innerHTML = html;
}

function getSelectedVariant() {
  if (!product.variants || product.variants.length === 0) return null;

  return product.variants.find((v) => v.value === selectedColor || v.value === selectedSize);
}

function updateStockDisplay() {
  if (!isProductAvailable) return;
  const variant = getSelectedVariant();
  const stockInfo = document.getElementById('stockInfo');
  if (!stockInfo) return;
  
  const stock = variant ? variant.stock : product.stock;

  const buyNowBtn = document.querySelector('.btn-buy-now');
  const addCartBtn = document.querySelector('.btn-add-cart');

  if (stock <= 0) {
    stockInfo.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> OUT OF STOCK';
    stockInfo.className = 'stock-status out-stock';

    if (buyNowBtn) {
      buyNowBtn.disabled = true;
      buyNowBtn.style.opacity = '0.5';
      buyNowBtn.style.cursor = 'not-allowed';
    }
    if (addCartBtn) {
      addCartBtn.disabled = true;
      addCartBtn.style.opacity = '0.5';
      addCartBtn.style.cursor = 'not-allowed';
    }
  } else if (stock < 5) {
    stockInfo.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ONLY ${stock} LEFT IN STOCK`;
    stockInfo.className = 'stock-status low-stock';

    if (buyNowBtn) {
      buyNowBtn.disabled = false;
      buyNowBtn.style.opacity = '1';
      buyNowBtn.style.cursor = 'pointer';
    }
    if (addCartBtn) {
      addCartBtn.disabled = false;
      addCartBtn.style.opacity = '1';
      addCartBtn.style.cursor = 'pointer';
    }
  } else {
    stockInfo.innerHTML = '<i class="fa-solid fa-circle-check"></i> IN STOCK';
    stockInfo.className = 'stock-status in-stock';

    if (buyNowBtn) {
      buyNowBtn.disabled = false;
      buyNowBtn.style.opacity = '1';
      buyNowBtn.style.cursor = 'pointer';
    }
    if (addCartBtn) {
      addCartBtn.disabled = false;
      addCartBtn.style.opacity = '1';
      addCartBtn.style.cursor = 'pointer';
    }
  }
}

function updateTitle() {
  // Optional: match mockup by adding (Color, Size) to title
}

async function toggleWishlist(productId) {
  try {
    const res = await fetch('/user/wishlist/toggle', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ productId }),
    });

    if (res.status === 401) {
      window.location.href = '/user/login';
      return;
    }

    const data = await res.json();
    if (data.success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: data.message,
        showConfirmButton: false,
        timer: 3000,
        background: '#ffffff',
        color: '#1a1a1a',
        iconColor: '#c26a00',
      });
    } else {
      if (data.message === 'Please log in to continue.') {
        window.location.href = '/user/login';
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: data.message || 'Login required',
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function updateQty(delta) {
  quantity += delta;
  if (quantity < 1) quantity = 1;
  const qtyVal = document.getElementById('qtyVal');
  if (qtyVal) qtyVal.innerText = quantity;
}

async function handleAddToCart(isBuyNow = false) {
  try {
    const variant = getSelectedVariant();
    if (!variant) {
      Swal.fire({
        icon: 'warning',
        title: 'Select option',
        text: ' Please select a variant',
      });
      return;
    }

    const variantId = variant ? variant._id : null;

    const url = `/user/cart/add/${product._id}?qty=${quantity}${variantId ? '&variantId=' + variantId : ''}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 401) {
      window.location.href = '/user/login';
      return;
    }

    const data = await res.json();
    if (data.success) {
      // Update global cart badge
      updateCartBadge(data.cartCount);

      if (isBuyNow) {
        window.location.href = '/user/checkout';
        return;
      }

      Swal.fire({
        title: 'Added to Cart!',
        text: 'This product has been added to your shopping cart.',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#c26a00',
        cancelButtonColor: '#1a1a1a',
        confirmButtonText: 'Go to Cart',
        cancelButtonText: 'Continue Shopping',
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = '/user/cart';
        }
      });
    } else {
      if (data.message === 'Please log in to continue.') {
        window.location.href = '/user/login';
      } else {
        const stockInfo = document.getElementById('stockInfo');
        if (data.message && data.message.toLowerCase().includes('unavailable')) {
          stockInfo.innerHTML = `
            <i class="fa-solid fa-circle-xmark"></i>
            This product is currently unavailable
            `;
          stockInfo.className = 'stock-status out-stock';

          document.querySelector('.btn-buy-now').disabled = true;
          document.querySelector('.btn-add-cart').disabled = true;
        }
        if (data.message?.toLowerCase().includes('only')) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: data.message,
            showConfirmButton: false,
            timer: 2500,
          });
        }
      }
    }
  } catch (err) {
    Swal.fire({
      title: 'Oops!',
      text: 'Something went wrong. Please try again.',
      icon: 'warning',
      confirmButtonColor: '#c26a00',
    });
  }
}

async function checkAvailabilityLive() {
  try {
    const res = await fetch(`/user/product/check/${product._id}`);
    const data = await res.json();

    const stockInfo = document.getElementById('stockInfo');
    const buyNowBtn = document.querySelector('.btn-buy-now');
    const addCartBtn = document.querySelector('.btn-add-cart');

    if (!data.available) {
      isProductAvailable = false;

      stockInfo.innerHTML = `
        <i class="fa-solid fa-circle-xmark"></i>
        This product is currently unavailable
      `;
      stockInfo.className = 'stock-status out-stock';

      buyNowBtn.disabled = true;
      buyNowBtn.style.opacity = '0.5';
      buyNowBtn.style.cursor = 'not-allowed';
      addCartBtn.disabled = true;
      addCartBtn.style.opacity = '0.5';
      addCartBtn.style.cursor = 'not-allowed';
    } else {
      isProductAvailable = true;
      updateStockDisplay(); // restore stock logic
    }
  } catch (err) {
    console.log('Availability check failed');
  }
}

function handleBuyNow() {
  handleAddToCart(true);
}
