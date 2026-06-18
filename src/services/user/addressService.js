const Address = require('../../models/addressModel');
const axios = require('axios');

const validateIndianPincode = async (pincode) => {
  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);

    return response.data[0].Status === 'Success' && response.data[0].PostOffice?.length > 0;
  } catch (error) {
    return false;
  }
};
exports.validateAddressData = async (data) => {
  const errors = {};

  const name = data.name?.trim();
  const phone = data.phone?.trim();
  const street = data.street?.trim();
  const city = data.city?.trim();
  const state = data.state?.trim();
  const pincode = data.pincode?.trim();

  if (!name) {
    errors.name = 'Full name is required';
  } else if (name.length < 3 || name.length > 50) {
    errors.name = 'Name must be between 3 and 50 characters';
  } else if (!/^[A-Za-z\s]+$/.test(name)) {
    errors.name = 'Name can contain only letters and spaces';
  }

  if (!phone) {
    errors.phone = 'Mobile number is required';
  } else if (!/^[6-9]\d{9}$/.test(phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number';
  } else if (/^(\d)\1{9}$/.test(phone)) {
    errors.phone = 'Invalid mobile number';
  } else if (/^[6-9]0{9}$/.test(phone)) {
    errors.phone = 'Invalid mobile number';
  }

  if (!street) {
    errors.street = 'Address is required';
  } else if (street.length < 5 || street.length > 200) {
    errors.street = 'Address must be between 5 and 200 characters';
  } else if (!/^[A-Za-z0-9\s,./#-]+$/.test(street)) {
    errors.street = 'Address contains invalid characters';
  } else if (/^\d+$/.test(street)) {
    errors.street = 'Address cannot contain only numbers';
  } else if (/^(\d)\1+$/.test(street)) {
    errors.street = 'Invalid address';
  }

  if (!city) {
    errors.city = 'City is required';
  } else if (city.length < 2 || city.length > 50) {
    errors.city = 'City name is invalid';
  } else if (!/^[A-Za-z\s]+$/.test(city)) {
    errors.city = 'City can contain only letters';
  }

  if (!state) {
    errors.state = 'State is required';
  } else if (state.length < 2 || state.length > 50) {
    errors.state = 'State name is invalid';
  } else if (!/^[A-Za-z\s]+$/.test(state)) {
    errors.state = 'State can contain only letters';
  }

  if (!pincode) {
    errors.pincode = 'Pincode is required';
  } else if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    errors.pincode = 'Enter a valid 6-digit pincode';
  } else {
    const isValidPincode = await validateIndianPincode(pincode);

    if (!isValidPincode) {
      errors.pincode = 'Invalid pincode';
    }
  }
  return errors;
};
/*
exports.validateAddressData = (data) => {
  let errors = {};

  const nameRegex = /^[A-Za-z ]{3,50}$/;
  const phoneRegex = /^[0-9]{8,15}$/;
  const pincodeRegex = /^[0-9]{4,10}$/;

  if (!data.name?.trim()) {
    errors.name = 'Full name is required';
  } else if (!nameRegex.test(data.name.trim())) {
    errors.name = 'Enter a valid name';
  }

  if (!data.phone?.trim()) {
    errors.phone = 'Mobile number is required';
  } else if (!phoneRegex.test(data.phone.trim())) {
    errors.phone = 'Enter a valid mobile number';
  }

  if (!data.pincode?.trim()) {
    errors.pincode = 'Pincode is required';
  } else if (!pincodeRegex.test(data.pincode.trim())) {
    errors.pincode = 'Invalid pincode';
  }

  if (!data.street?.trim()) {
    errors.street = 'Address is required';
  }

  if (!data.city?.trim()) {
    errors.city = 'City is required';
  }

  if (!data.state?.trim()) {
    errors.state = 'State is required';
  }

  return errors;
};
*/

exports.createAddress = async (userId, data) => {
  const sanitizedData = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    street: data.street.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    country: 'India',
  };
  const isDefaultChecked = data.defaultAddress === 'on';

  const existingAddresses = await Address.find({ userId });

  let isDefault = false;

  if (existingAddresses.length === 0) {
    isDefault = true;
  }

  if (isDefaultChecked) {
    isDefault = true;

    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }

  return await Address.create({
    ...sanitizedData,
    userId,
    isDefault,
  });
};

exports.updateAddress = async (userId, addressId, data) => {
  const isDefaultChecked = data.defaultAddress === 'on';

  let updateData = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    street: data.street.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    country: 'India',
    isDefault: isDefaultChecked,
  };
  const existingAddress = await Address.findById(addressId);

  if (!existingAddress) {
    throw new Error('Address not found');
  }

  if (!isDefaultChecked && existingAddress.isDefault) {
    const remainingAddresses = await Address.find({
      userId,
      _id: { $ne: addressId },
    }).sort({ createdAt: -1 });

    if (remainingAddresses.length > 0) {
      await Address.updateOne({ _id: remainingAddresses[0]._id }, { $set: { isDefault: true } });
    } else {
      updateData.isDefault = true;
    }
  }

  // Setting new default
  if (isDefaultChecked) {
    await Address.updateMany(
      {
        userId,
        _id: { $ne: addressId },
      },
      {
        $set: { isDefault: false },
      }
    );
  }

  return await Address.findByIdAndUpdate(addressId, updateData, { new: true });
};

// DELETE ADDRESS
exports.deleteAddress = async (userId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    userId,
  });

  if (!address) {
    throw new Error('Address not found');
  }

  await Address.findOneAndDelete({
    _id: addressId,
    userId,
  });

  // If deleted address was default
  if (address.isDefault) {
    const remainingAddresses = await Address.find({ userId }).sort({ createdAt: -1 });

    if (remainingAddresses.length > 0) {
      await Address.updateOne({ _id: remainingAddresses[0]._id }, { $set: { isDefault: true } });
    }
  }

  return true;
};
