// Data initialized from server (to be defined in the EJS file before script load)
// const productId = "<%= product._id %>";
// let existingThumbnail = "<%= product.thumbnail || '' %>";
// let variantImagesData = <%- JSON.stringify(...) %>;

let thumbnailBlob = null;
let cropper;
let currentSlot = null;
let currentVariantIndex = null; // null for base product

const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
const variantImageModal = new bootstrap.Modal(document.getElementById('variantImageModal'));

function triggerThumbnailInput() {
  currentVariantIndex = null;
  currentSlot = 1;
  document.getElementById('thumbInput').click();
}

function handleThumbnailSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  thumbnailBlob = file;

  const img = document.getElementById('thumbPreview');
  img.src = URL.createObjectURL(file);
  img.style.display = 'block';
}

function triggerFileInput(slot, isThumbnail = false) {
  if (isThumbnail) {
    currentVariantIndex = null;
    document.getElementById('thumbInput').click();
  } else {
    document.getElementById(`vInput_${slot}`).click();
  }
}

function deleteVariant(btn) {
  const row = btn.closest('.variant-row');
  const index = parseInt(row.getAttribute('data-index'));

  variantImagesData.splice(index, 1);
  row.remove();

  reindexVariants();
}

function reindexVariants() {
  const rows = document.querySelectorAll('.variant-row');

  rows.forEach((row, i) => {
    row.setAttribute('data-index', i);

    const inputs = row.querySelectorAll('input[type="file"]');
    inputs.forEach((input) => {
      input.name = `variantImages_${i}`;
    });
  });
}

function removeImage(event, slot) {
  event.stopPropagation();
  variantImagesData[currentVariantIndex].existing[slot - 1] = '';
  variantImagesData[currentVariantIndex].newBlobs[slot - 1] = null;
  document.getElementById(`vImg_${slot}`).src = '';
  document.getElementById(`vSlot_${slot}`).classList.remove('has-image');
  updateVariantPreviews(currentVariantIndex);
}

function handleFileSelect(event, slot) {
  const file = event.target.files[0];
  if (!file) return;

  // IMMEDIATE VALIDATION
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid File Type',
      text: 'Please select a valid image (jpg, jpeg, png, or webp)',
      confirmButtonColor: '#ca8a04',
    });
    event.target.value = ''; // Clear selection
    return;
  }

  currentSlot = slot;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('cropperImage').src = e.target.result;
    cropModal.show();
  };
  reader.readAsDataURL(file);
}

document.getElementById('cropModal').addEventListener('shown.bs.modal', function () {
  cropper = new Cropper(document.getElementById('cropperImage'), {
    aspectRatio: 4 / 5,
    viewMode: 2,
    autoCropArea: 1,
  });
});

document.getElementById('cropModal').addEventListener('hidden.bs.modal', function () {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  if (typeof currentVariantIndex === 'number') {
    const input = document.getElementById(`vInput_${currentSlot}`);
    if (input) input.value = '';
  } else {
    const input = document.getElementById('thumbInput');
    if (input) input.value = '';
  }
});

document.getElementById('cropButton').onclick = function () {
  if (!cropper) return;
  cropper.getCroppedCanvas({ width: 800, height: 1000 }).toBlob(
    (blob) => {
      if (typeof currentVariantIndex === 'number') {
        //variant
        variantImagesData[currentVariantIndex].newBlobs[currentSlot - 1] = blob;
        variantImagesData[currentVariantIndex].existing[currentSlot - 1] = '';
        const previewImg = document.getElementById(`vImg_${currentSlot}`);
        previewImg.src = URL.createObjectURL(blob);
        document.getElementById(`vSlot_${currentSlot}`).classList.add('has-image');

        updateVariantPreviews(currentVariantIndex);
      } else {
        thumbnailBlob = blob;
        const img = document.getElementById('thumbPreview');
        img.src = URL.createObjectURL(blob);
        img.style.display = 'block';
      }
      cropModal.hide();
    },
    'image/jpeg',
    0.9
  );
};

function openVariantImageModal(vIdx) {
  currentVariantIndex = vIdx;
  const container = document.getElementById('variantModalSlots');
  container.innerHTML = '';
  const data = variantImagesData[vIdx];
  for (let i = 1; i <= 4; i++) {
    const existingImg = data.existing[i - 1];

    const src = data.newBlobs[i - 1]
      ? URL.createObjectURL(data.newBlobs[i - 1])
      : existingImg?.url || '';
    //const src = data.newBlobs[i - 1] ? URL.createObjectURL(data.newBlobs[i - 1]) : data.existing[i - 1];
    const hasImg = src !== '';
    const slotHtml = `
            <div class="col-6">
                <div class="image-slot ${hasImg ? 'has-image' : ''}" id="vSlot_${i}" onclick="triggerFileInput(${i})">
                    <div class="slot-placeholder">
                        <i class="fas fa-plus mb-2"></i>
                        <div class="small">Image ${i}</div>
                    </div>
                    <img id="vImg_${i}" src="${src}" alt="" style="${hasImg ? 'display:block' : ''}">
                    <input type="file" id="vInput_${i}" accept="image/*" hidden onchange="handleFileSelect(event, ${i})">
                    <button type="button" class="remove-img-btn" style="${hasImg ? 'display:flex' : ''}" onclick="removeImage(event, ${i})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    container.insertAdjacentHTML('beforeend', slotHtml);
  }
  variantImageModal.show();
}

function updateVariantPreviews(vIdx) {
  const previewContainer = document.getElementById(`variantPreviews_${vIdx}`);
  previewContainer.innerHTML = '';
  const data = variantImagesData[vIdx];
  data.existing.forEach((img) => {
    if (img)
      previewContainer.insertAdjacentHTML(
        'beforeend',
        `<img src="${img?.url || ''}" class="variant-img-preview">`
      );
  });
  data.newBlobs.forEach((blob) => {
    if (blob)
      previewContainer.insertAdjacentHTML(
        'beforeend',
        `<img src="${URL.createObjectURL(blob)}" class="variant-img-preview">`
      );
  });
}

function addVariant() {
  const vIdx = variantImagesData.length;
  variantImagesData.push({ existing: ['', '', '', ''], newBlobs: [null, null, null, null] });
  const row = `
    <div class="row mb-3 align-items-center variant-row" data-index="${vIdx}">
      <input type="hidden" name="variantId[]" value="Color">
      <div class="col-md-2">
        <input name="variantType[]" class="form-control form-control-sm" value="Color">
        <div class="error-variant text-danger" style="font-size: 10px; display:none;"></div>
      </div>
      <div class="col-md-3">
        <input name="variantValue[]" class="form-control form-control-sm" placeholder="e.g. Black">
      </div>
      <div class="col-md-2">
        <input name="variantStock[]" type="number" class="form-control form-control-sm" placeholder="0">
      </div>
      <div class="col-md-4">
        <div class="d-flex align-items-center">
            <div class="variant-images-previews d-flex" id="variantPreviews_${vIdx}"></div>
            <button type="button" class="btn btn-sm btn-outline-gold ms-auto" onclick="openVariantImageModal(${vIdx})">
                <i class="fas fa-images"></i> Images
            </button>
        </div>
      </div>
      <div class="col-md-1 text-end">
        <button type="button" class="btn btn-sm btn-light text-danger" onclick="this.closest('.variant-row').remove()">🗑</button>
      </div>
    </div>
  `;
  document.getElementById('variantContainer').insertAdjacentHTML('beforeend', row);
  const newRow = document.querySelector(`.variant-row[data-index="${vIdx}"]`);
  newRow.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      newRow.querySelector('.error-variant').style.display = 'none';
    });
  });
}

function setFieldError(id, msg) {
  const errEl = document.getElementById(`error-${id}`);
  if (errEl) {
    errEl.innerText = msg;
    errEl.classList.remove('d-none');
  }
}

function clearFieldError(id) {
  const errEl = document.getElementById(`error-${id}`);
  if (errEl) {
    errEl.classList.add('d-none');
  }
}

['Name', 'Category', 'Price', 'Offer', 'Desc'].forEach((idSuffix) => {
  const el = document.getElementById(`prod${idSuffix}`);
  if (el) {
    el.addEventListener('input', () => {
      const map = {
        prodName: 'name',
        prodCategory: 'category',
        prodPrice: 'price',
        prodOffer: 'offer',
        prodDesc: 'description',
      };
      clearFieldError(map[el.id]);
    });
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => clearFieldError('category'));
    }
  }
});

document.getElementById('editProductForm').onsubmit = async function (e) {
  e.preventDefault();
  ['name', 'category', 'price', 'offer', 'description'].forEach(clearFieldError);
  document.querySelectorAll('.error-variant').forEach((el) => (el.style.display = 'none'));
  document.getElementById('submitSpinner').classList.remove('d-none');
  const submitBtn = this.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const formData = new FormData(this);
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob);
    } else if (existingThumbnail) {
      formData.append('existingThumbnail',JSON.stringify(existingThumbnail) );
    }

    let hasError = false;

    const rows = document.querySelectorAll('.variant-row');

    rows.forEach((row, i) => {
      const vIdx = row.getAttribute('data-index');
      const data = variantImagesData[vIdx];

      const totalImages =
        data.existing.filter((img) => img).length + data.newBlobs.filter((b) => b).length;

      if (totalImages < 3) {
        const err = row.querySelector('.error-variant');
        err.innerText = 'Minimum 3 images required';
        err.style.display = 'block';
        hasError = true;
      }
    });

    const seen = new Set();
    rows.forEach((row, i) => {
      const type = row.querySelector('[name="variantType[]"]').value.trim().toLowerCase();
      const value = row.querySelector('[name="variantValue[]"]').value.trim().toLowerCase();
        if (type === '' || value === '') {
  const err = row.querySelector('.error-variant');

  err.innerText = 'Variant fields required';
  err.style.display = 'block';

  hasError = true;

  return;
}

const key = `${type}-${value}`;

if (seen.has(key)) {

  const err = row.querySelector('.error-variant');

  err.innerText = 'Duplicate variant not allowed';
  err.style.display = 'block';

  hasError = true;

} else {

  seen.add(key);
}
      /*const key = `${type}-${value}`;
      if (seen.has(key)) {
        const err = row.querySelector('.error-variant');
        err.innerText = 'Duplicate variant not allowed';
        err.style.display = 'block';
        hasError = true;
      } else {
        seen.add(key);
      }

      if (!type || !value) {
        const err = row.querySelector('.error-variant');
        err.innerText = 'Variant fields required';
        err.style.display = 'block';
        hasError = true;
      }
    });
*/
    if (hasError) {
        document.getElementById('submitSpinner').classList.add('d-none');
        submitBtn.disabled = false;
        return;
    }
    //append images
    // const rows = document.querySelectorAll('.variant-row');
    rows.forEach((row, i) => {
      const vIdx = row.getAttribute('data-index');
      const data = variantImagesData[vIdx];
      data.existing.forEach((url) => {
        if (url) formData.append(`existingVariantImages_${i}`,JSON.stringify(url));
      });
      data.newBlobs.forEach((blob, bIdx) => {
        if (blob) formData.append(`variantImages_${i}`, blob, `variant-${i}-${bIdx}.jpg`);
      });
    });

    const response = await fetch(`/admin/products/edit/${productId}`, { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      Swal.fire({ icon: 'success', title: 'Updated!', text: result.message, confirmButtonColor: '#ca8a04' }).then(
        () => {
          window.location.href = result.redirectUrl || '/admin/products';
        }
      );
    } else {
      if (result.errors) {
        for (const [key, msg] of Object.entries(result.errors)) {
          if (key.startsWith('variant_')) {
            const idx = key.split('_')[1];
            const row = document.querySelectorAll('.variant-row')[idx];
            if (row) {
              const err = row.querySelector('.error-variant');
              err.innerText = msg;
              err.style.display = 'block';
            }
          } else if (key === 'images') {
            Swal.fire('Wait!', msg, 'warning');
          } else {
            setFieldError(key, msg);
          }
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: result.message || 'Update failed',
          confirmButtonColor: '#ca8a04',
        });
      }
    }
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'Server communication failed.', 'error');
  } finally {
    document.getElementById('submitSpinner').classList.add('d-none');
    submitBtn.disabled = false;
  }
};
