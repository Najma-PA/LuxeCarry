const Address = require('../../models/addressModel');

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

exports.createAddress = async (userId, data) => {
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
    ...data,
    userId,
    isDefault,
  });
};

exports.updateAddress = async (userId, addressId, data) => {
  const isDefaultChecked = data.defaultAddress === 'on';

  let updateData = {
    ...data,
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
