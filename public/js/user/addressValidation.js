document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addressForm');

  if (!form) return;

  const name = document.getElementById('name');
  const phone = document.getElementById('phone');
  const street = document.getElementById('street');
  const city = document.getElementById('city');
  const state = document.getElementById('state');
  const pincode = document.getElementById('pincode');
  let pincodeVerified = false;
  const setError = (id, message) => {
    const element = document.getElementById(id);
    if (element) element.textContent = message;
  };

  const clearError = (id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = '';
  };

  const validateName = () => {
    const value = name.value.trim();

    if (!value) {
      setError('nameError', 'Full name is required');
      return false;
    }

    if (!/^[A-Za-z\s]{3,50}$/.test(value)) {
      setError('nameError', 'Name must contain only letters and spaces');
      return false;
    }

    clearError('nameError');
    return true;
  };

  const validatePhone = () => {
    const value = phone.value.trim();

    if (!value) {
      setError('phoneError', 'Mobile number is required');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(value)) {
      setError('phoneError', 'Enter a valid 10-digit mobile number');
      return false;
    }

    if (/^(\d)\1{9}$/.test(value)) {
      setError('phoneError', 'Invalid mobile number');
      return false;
    }
    if (/^[6-9]0{9}$/.test(value)) {
      setError('phoneError', 'Invalid mobile number');
      return false;
    }
    clearError('phoneError');
    return true;
  };

  const validateStreet = () => {
    const value = street.value.trim();

    if (!value) {
      setError('streetError', 'Address is required');
      return false;
    }

    if (value.length < 5 || value.length > 200) {
      setError('streetError', 'Address must be between 5 and 200 characters');
      return false;
    }
    // Allow only valid address characters
    if (!/^[A-Za-z0-9\s,./#-]+$/.test(value)) {
      setError('streetError', 'Address contains invalid characters');
      return false;
    }

    if (/^\d+$/.test(value)) {
      setError('streetError', 'Address cannot contain only numbers');
      return false;
    }

    if (/^(\d)\1+$/.test(value)) {
      setError('streetError', 'Invalid address');
      return false;
    }
    clearError('streetError');
    return true;
  };
  /*
  const validateCity = () => {
    const value = city.value.trim();

    if (!value) {
      setError('cityError', 'City is required');
      return false;
    }
    if (!/^[A-Za-z\s]{2,50}$/.test(value)) {
      setError('cityError', 'Enter a valid city name');
      return false;
    }

    clearError('cityError');
    return true;
  };

  const validateState = () => {
    const value = state.value.trim();
    if (!value) {
      setError('stateError', 'State is required');
      return false;
    }
    if (!/^[A-Za-z\s]{2,50}$/.test(value)) {
      setError('stateError', 'Enter a valid state name');
      return false;
    }

    clearError('stateError');
    return true;
  };
*/
  const validatePincode = () => {
    const value = pincode.value.trim();
    if (!value) {
      setError('pincodeError', 'Pincode is required');
      return false;
    }
    if (!/^[1-9][0-9]{5}$/.test(value)) {
      setError('pincodeError', 'Enter a valid 6-digit pincode');
      return false;
    }
    if (!pincodeVerified) {
      setError('pincodeError', 'Please verify a valid pincode');
      return false;
    }
    clearError('pincodeError');
    return true;
  };

  phone.addEventListener('input', () => {
    phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
  });

  pincode.addEventListener('blur', async () => {
    const value = pincode.value.trim();

    if (!/^[1-9][0-9]{5}$/.test(value)) {
      pincodeVerified = false;
      city.value = '';
      state.value = '';
      return;
    }

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);

      const data = await response.json();

      if (data[0].Status === 'Success' && data[0].PostOffice?.length) {
        pincodeVerified = true;
        const postOffice = data[0].PostOffice[0];

        city.value = postOffice.District;
        state.value = postOffice.State;

        clearError('pincodeError');
        clearError('cityError');
        clearError('stateError');
      } else {
        pincodeVerified = false;
        city.value = '';
        state.value = '';
        setError('pincodeError', 'Invalid pincode');
        setError('cityError', 'Please enter a valid pincode');
        setError('stateError', 'Please enter a valid pincode');
      }
    } catch (error) {
      pincodeVerified = false;
      city.value = '';
      state.value = '';
      console.error(error);
      setError('pincodeError', 'Unable to verify pincode');
      setError('cityError', 'Please enter a valid pincode');
      setError('stateError', 'Please enter a valid pincode');
    }
  });
  const validateCity = () => {
    if (!city.value.trim()) {
      setError('cityError', 'Please enter a valid pincode');
      return false;
    }

    clearError('cityError');
    return true;
  };

  const validateState = () => {
    if (!state.value.trim()) {
      setError('stateError', 'Please enter a valid pincode');
      return false;
    }

    clearError('stateError');
    return true;
  };
  name.addEventListener('input', () => {
    clearError('nameError');
  });

  phone.addEventListener('input', () => {
    clearError('phoneError');
  });

  street.addEventListener('input', () => {
    clearError('streetError');
  });
  /*
city.addEventListener('input', () => {
  clearError('cityError');
});

state.addEventListener('input', () => {
  clearError('stateError');
});
*/
  pincode.addEventListener('input', () => {
    pincodeVerified = false;
    pincode.value = pincode.value.replace(/\D/g, '').slice(0, 6);

    clearError('pincodeError');
    clearError('cityError');
    clearError('stateError');

    city.value = '';
    state.value = '';
  });
  form.addEventListener('submit', (e) => {
    const nameValid = validateName();
    const phoneValid = validatePhone();
    const streetValid = validateStreet();
    const cityValid = validateCity();
    const stateValid = validateState();
    const pincodeValid = validatePincode();

    const isValid =
      nameValid && phoneValid && streetValid && cityValid && stateValid && pincodeValid;

    if (!isValid) {
      e.preventDefault();
    }
  });
});
