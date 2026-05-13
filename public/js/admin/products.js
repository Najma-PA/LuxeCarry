document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('adminSearchInput');
  const tableBody = document.getElementById('product-table-body');
  const paginationContainer = document.getElementById('pagination-container');
  const tabLinks = document.querySelectorAll('.tab-link');

  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => updateTable(), 500);
    });
  }

  if (tabLinks) {
    tabLinks.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const status = tab.dataset.status;
        tabLinks.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        updateTable(1, status);
      });
    });
  }

  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const link = e.target.closest('.pagination-link');
      if (link) {
        e.preventDefault();
        updateTable(link.dataset.page);
      }
    });
  }

  async function updateTable(page = 1, forceStatus = null) {
    if (!tableBody) return;
    const url = new URL(window.location.href);
    if (searchInput) url.searchParams.set('search', searchInput.value);
    if (forceStatus) url.searchParams.set('status', forceStatus);
    url.searchParams.set('page', page);

    tableBody.style.opacity = '0.5';
    try {
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.success) {
        tableBody.innerHTML = data.tableHtml;
        if (paginationContainer) paginationContainer.innerHTML = data.paginationHtml;
        window.history.pushState({ path: url.toString() }, '', url.toString());
      }
    } catch (err) {
      console.error('Table update failed:', err);
    } finally {
      tableBody.style.opacity = '1';
    }
  }

  window.deleteProduct = async function (id) {
    const result = await Swal.fire({
      title: 'Archive this product?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c26a00',
      cancelButtonColor: '#64748b',
    });
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/admin/products/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data?.success) {
          document.getElementById(`row-${id}`)?.remove();
          Swal.fire({ icon: 'success', title: 'Product archived', timer: 1500, showConfirmButton: false });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Action failed' });
      }
    }
  };

  window.restoreProduct = async function (id) {
    try {
      const res = await fetch(`/admin/products/restore/${id}`, { method: 'PATCH' });
      const data = await res.json();
      if (data?.success) {
        document.getElementById(`row-${id}`)?.remove();
        Swal.fire({ icon: 'success', title: 'Product restored', timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Action failed' });
    }
  };
});
