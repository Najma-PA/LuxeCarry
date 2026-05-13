document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.querySelector('.container.my-5');
  const checkoutBtn = document.getElementById('proceed-checkout-btn');

  if (!cartContainer) return;

  //CHECKOUT VALIDATION

  checkoutBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/user/cart/validate');
      const data = await res.json();

      // Clear previous errors
      clearAllMessages();

      if (data.success) {
        window.location.href = '/user/checkout';
        return;
      }

      if (Array.isArray(data.errors)) {
        showItemErrors(data.errors);
      }
    } catch (err) {
      console.error('Validation failed:', err);
    }
  });

  // REMOVE ITEM
  cartContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('.cart-action-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const itemId = btn.dataset.id;

    if (action === 'remove') {
      await removeItem(itemId);
    }

    if (action === 'qty-plus') {
      await updateQty(itemId, 1);
    }

    if (action === 'qty-minus') {
      await updateQty(itemId, -1);
    }
  });

  //UPDATE QUANTITY

  async function updateQty(itemId, change) {
    try {
      const res = await fetch(`/user/cart/update/${itemId}?change=${change}`, {
        method: 'PATCH',
      });

      const data = await res.json();

      if (!data.success) {
        if (data.message) {
          const msgBox = document.getElementById(`availability-msg-${itemId}`);
          if (msgBox) {
            msgBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message}`;
          }
          const row = document.getElementById(`item-row-${itemId}`);
          if (row) row.classList.add('opacity-75');

          const checkoutBtn = document.getElementById('proceed-checkout-btn');
          if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('disabled');
          }
        }
        return;
      }

      if (data.newQty === 0) {
        document.getElementById(`item-row-${itemId}`)?.remove();
      } else {
        const qtyEl = document.getElementById(`qty-${itemId}`);
        const plusBtn = document.querySelector(`[data-action="qty-plus"][data-id="${itemId}"]`);

        qtyEl.innerText = data.newQty;
        //const msgBox = document.getElementById(`availability-msg-${itemId}`);
        if (data.newQty >= data.availableStock || data.newQty >= 5) {
          plusBtn.disabled = true;
          plusBtn.classList.add('disabled');
        } else {
          plusBtn.disabled = false;
          plusBtn.classList.remove('disabled');
          // if(msgBox)msgBox.innerHTML='';
        }
        // document.getElementById(`qty-${itemId}`).innerText = data.newQty;
        document.getElementById(`subtotal-${itemId}`).innerText = `₹${data.itemTotal.toLocaleString()}.00`;
      }

      await syncCartUI();
      // updateSummary(data);
      //await validateCartState();
    } catch (err) {
      console.error(err);
    }
  }

  //REMOVE ITEM

  async function removeItem(itemId) {
    try {
      const res = await fetch(`/user/cart/item/${itemId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.success) return;

      document.getElementById(`item-row-${itemId}`)?.remove();

      await syncCartUI();
      // updateSummary(data);
      //await validateCartState();
    } catch (err) {
      console.error(err);
    }
  }

  //SHOW BACKEND ERRORS
  function showItemErrors(errors) {
    let hasError = false;

    errors.forEach((err) => {
      const msgBox = document.getElementById(`availability-msg-${err.id}`);
      const row = document.getElementById(`item-row-${err.id}`);

      if (!msgBox) return;

      msgBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message}`;

      if (row) row.classList.add('opacity-75');

      hasError = true;
    });

    // Disable checkout
    if (checkoutBtn) {
      checkoutBtn.disabled = hasError;
      if (hasError) {
        checkoutBtn.classList.add('disabled');
        //checkoutBtn.innerText = "Fix issues to continue" ;
      } else {
        checkoutBtn.classList.remove('disabled');
        checkoutBtn.innerText = 'Proceed to Checkout';
      }
    }
  }

  //CLEAR OLD ERRORS

  function clearAllMessages() {
    document.querySelectorAll('[id^="availability-msg-"]').forEach((el) => {
      el.innerHTML = '';
    });

    document.querySelectorAll('[id^="item-row-"]').forEach((row) => {
      row.classList.remove('opacity-75');
    });

    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove('disabled');
      checkoutBtn.innerText = 'Proceed to Checkout';
    }
  }

  async function validateCartState() {
    try {
      const res = await fetch('/user/cart/validate');
      const data = await res.json();
      clearAllMessages();
      if (!data.success && Array.isArray(data.errors)) {
        showItemErrors(data.errors);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function syncCartUI() {
    try {
      const res = await fetch('/user/cart/items-status');
      const data = await res.json();

      if (!data.success) return;

      // Update navbar cart badge immediately
      const badge = document.getElementById('cart-count-badge');
      if (badge && data.cartCount !== undefined) {
        badge.innerText = data.cartCount > 0 ? data.cartCount : '';
        badge.style.setProperty('display', data.cartCount > 0 ? 'flex' : 'none', 'important');
      }

      // Handle empty cart state
      if (data.items.length === 0) {
        const container = document.querySelector('.container.my-5');
        if (container) {
          container.innerHTML = `
                    <div class="text-center py-5">
                        <h4 class="text-muted mb-4">Your cart is currently empty.</h4>
                        <a href="/user/shop" class="btn-checkout-premium px-5">Explore Collection</a>
                    </div>
                `;
        }
        return; // Stop here if cart is empty to avoid null references
      }

      // Update item count text
      const cartCountEl = document.getElementById('cart-count');
      if (cartCountEl) {
        cartCountEl.innerText = `(${data.items.length} items)`;
      }

      data.items.forEach((item) => {
        const qtyEl = document.getElementById(`qty-${item.id}`);
        const subtotalEl = document.getElementById(`subtotal-${item.id}`);

        const plusBtn = document.querySelector(`[data-action="qty-plus"][data-id="${item.id}"]`);
        const minusBtn = document.querySelector(`[data-action="qty-minus"][data-id="${item.id}"]`);

        // quantity
        if (qtyEl) qtyEl.innerText = item.quantity;

        // subtotal
        if (subtotalEl) {
          subtotalEl.innerText = `₹${item.itemTotal.toLocaleString()}.00`;
        }

        // PLUS button
        if (plusBtn) {
          //  const msgBox = document.getElementById(`availability-msg-${item.id}`);
          if (item.quantity >= item.stock || item.quantity >= 5) {
            plusBtn.disabled = true;
            plusBtn.classList.add('disabled');
          } else {
            plusBtn.disabled = false;
            plusBtn.classList.remove('disabled');
            // if(msgBox) msgBox.innerHTML='';
          }
        }

        //MINUS button
        if (minusBtn) {
          if (item.quantity <= 1) {
            minusBtn.disabled = true;
            minusBtn.classList.add('disabled');
          } else {
            minusBtn.disabled = false;
            minusBtn.classList.remove('disabled');
          }
        }
      });

      // totals
      const subtotalEl = document.getElementById('cart-subtotal');
      if (subtotalEl) subtotalEl.innerText = `₹${data.cartSubtotal.toLocaleString()}.00`;

      const discountEl = document.getElementById('cart-discount');
      if (discountEl) discountEl.innerText = `₹${data.cartDiscount.toLocaleString()}.00`;

      const totalEl = document.getElementById('cart-total');
      if (totalEl) totalEl.innerText = `₹${data.cartTotal.toLocaleString()}.00`;

      // validate checkout again
      //if (data.items.some(item => !item.isActive || item.isDeleted)) {
      await validateCartState();
    } catch (err) {
      console.error('syncCartUI error:', err);
    }
  }
  // UPDATE SUMMARY

  function updateSummary(data) {
    document.getElementById('cart-subtotal').innerText = `₹${data.cartSubtotal.toLocaleString()}.00`;

    document.getElementById('cart-total').innerText = `₹${data.cartTotal.toLocaleString()}.00`;

    document.getElementById('cart-count').innerText = `(${data.itemCount} items)`;

    if (data.itemCount === 0) {
      document.querySelector('.container.my-5').innerHTML = `
                <div class="text-center py-5">
                    <h1>Shopping Cart</h1>
                    <h4>Your cart is empty.</h4>
                    <a href="/user/shop" class="btn-checkout-premium px-5">
                        Explore
                    </a>
                </div>
            `;
    }
  }

  validateCartState();
  syncCartUI();

  // 5-second polling for real-time validation and stock updates
  setInterval(syncCartUI, 5000);
});
