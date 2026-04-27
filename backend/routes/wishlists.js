const express = require('express');
const router  = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, checkWishlist } = require('../controllers/wishlistController');
const { authenticate } = require('../utils/authMiddleware');

// Todas requieren autenticación
router.get('/',                        authenticate, getWishlist);
router.get('/check/:productId',        authenticate, checkWishlist);
router.post('/:productId',             authenticate, addToWishlist);
router.delete('/:productId',           authenticate, removeFromWishlist);

module.exports = router;