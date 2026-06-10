const Banner = require('../../models/bannerModel');

const { uploadStream, deleteImage } = require('../../utils/cloudinaryHelper');

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });

    res.render('admin/banners', { banners });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.loadAddPage = (req, res) => {
  res.render('admin/addBanner');
};

exports.addBanner = async (req, res) => {
  try {
    const { title, subtitle, link, buttonText, status } = req.body;

    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    const result = await uploadStream(file.buffer, 'banners');

    const newBanner = new Banner({
      title,

      subtitle,

      link,

      buttonText,

      image: result,

      isActive: status === 'on' || status === true,
    });

    await newBanner.save();

    res.json({
      success: true,

      message: 'Banner added successfully',

      redirectUrl: '/admin/banners',
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) throw new Error('Banner not found');

    banner.isActive = !banner.isActive;

    await banner.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) throw new Error('Banner not found');

    await deleteImage(banner.image.public_id);

    await Banner.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
