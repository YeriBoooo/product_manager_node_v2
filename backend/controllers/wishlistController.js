const wishlistService = require('../services/wishlistService');

const getWishlist = async (req, res) => {
  try {
    const data = await wishlistService.getWishlist(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const data = await wishlistService.addToWishlist(req.user.id, req.params.productId);
    return res.status(201).json({ success: true, data, message: 'Agregado a favoritos' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
    return res.status(200).json({ success: true, message: 'Eliminado de favoritos' });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const checkWishlist = async (req, res) => {
  try {
    const inWishlist = await wishlistService.isInWishlist(req.user.id, req.params.productId);
    return res.status(200).json({ success: true, inWishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };