document.addEventListener('DOMContentLoaded', () => {
  // Handling Back/Forward Cache
  window.addEventListener('pageshow', (event) => {
    const navEntries = performance.getEntriesByType('navigation');
    if (event.persisted || (navEntries.length > 0 && navEntries[0].type === 'back_forward')) {
      window.location.replace('/user/profile');
    }
  });

  // Email Change Confirmation
  const profileForm = document.querySelector("form[action='/user/editProfile']");
  const emailField = document.getElementById('emailField');
  const originalEmail = emailField ? emailField.value : '';

  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      if (emailField && emailField.value !== originalEmail) {
        e.preventDefault();
        Swal.fire({
          title: 'Confirm Email Change',
          text: 'You changed your email. OTP will be sent. Continue?',
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#c26a00',
          cancelButtonColor: '#888',
          confirmButtonText: 'Yes, continue',
        }).then((result) => {
          if (result.isConfirmed) profileForm.submit();
        });
      }
    });
  }

  // Photo Management
  const profilePicInput = document.getElementById('profilePicInput');
  const removePicBtn = document.getElementById('removePicBtn');
  const performCropBtn = document.getElementById('performCropBtn');
  const cropperModalEl = document.getElementById('cropperModal');
  const cropperImage = document.getElementById('cropperImage');

  let cropper = null;
  let modal = null;
  if (cropperModalEl) modal = new bootstrap.Modal(cropperModalEl);

  if (profilePicInput) {
    profilePicInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // IMMEDIATE VALIDATION
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid File Type',
            text: 'Please select a valid image (jpg, jpeg, png, or webp)',
            confirmButtonColor: '#c26a00',
          });
          profilePicInput.value = ''; // Clear selection
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          cropperImage.src = event.target.result;
          modal.show();
          if (cropper) cropper.destroy();
          setTimeout(() => {
            cropper = new Cropper(cropperImage, {
              aspectRatio: 1,
              viewMode: 1,
              guides: false,
              autoCropArea: 1,
              movable: true,
              zoomable: true,
              rotatable: false,
              scalable: false,
            });
          }, 500);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (performCropBtn) {
    performCropBtn.addEventListener('click', () => {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('profilePic', blob, 'profile.jpg');
        await updateProfilePhoto(formData);
      });
    });
  }

  if (removePicBtn) {
    removePicBtn.addEventListener('click', async () => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will remove your profile picture.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c26a00',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!',
      });

      if (result.isConfirmed) {
        try {
          const res = await fetch('/user/profile/remove-picture', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            updateUIAfterPhotoChange(null);
            showToast('Profile picture removed');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  async function updateProfilePhoto(formData) {
    try {
      const response = await fetch('/user/profile/update-picture', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        modal.hide();
        updateUIAfterPhotoChange(result.path);
        showToast('Profile picture updated');
      } else {
        Swal.fire('Error', result.message || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Server error', 'error');
    }
  }

  function updateUIAfterPhotoChange(newPath) {
    const picPreview = document.getElementById('profilePicPreview');
    const letterAvatar = document.getElementById('profilePicLetter');
    const sideLetterAvatar = document.querySelector('.side-avatar-letter');
    const sidePicAvatar = document.querySelector('.side-profile-avatar');
    const removeBtn = document.getElementById('removePicBtn');

    if (newPath) {
      // Updated
      if (picPreview) {
        picPreview.src = newPath;
        picPreview.classList.remove('d-none');
      }
      if (letterAvatar) letterAvatar.classList.add('d-none');
      if (removeBtn) removeBtn.classList.remove('d-none');

      if (sidePicAvatar) {
        sidePicAvatar.src = newPath;
        sidePicAvatar.classList.remove('d-none');
      }
      if (sideLetterAvatar) sideLetterAvatar.classList.add('d-none');

      // Header avatars
      document.querySelectorAll('.profile-avatar').forEach((img) => {
        img.src = newPath;
        img.classList.remove('d-none');
      });
      document.querySelectorAll('.avatar-letter').forEach((div) => {
        if (!div.classList.contains('side-avatar-letter') && div.id !== 'profilePicLetter') {
          div.classList.add('d-none');
        }
      });
    } else {
      // Removed
      if (picPreview) picPreview.classList.add('d-none');
      if (letterAvatar) letterAvatar.classList.remove('d-none');
      if (removeBtn) removeBtn.classList.add('d-none');

      if (sidePicAvatar) sidePicAvatar.classList.add('d-none');
      if (sideLetterAvatar) sideLetterAvatar.classList.remove('d-none');

      document.querySelectorAll('.profile-avatar').forEach((img) => img.classList.add('d-none'));
      document.querySelectorAll('.avatar-letter').forEach((div) => div.classList.remove('d-none'));
    }
  }

  function showToast(msg) {
    Swal.fire({
      icon: 'success',
      title: msg,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  }
});
