const express = require('express');
const router  = express.Router();
const { getProductReviews, createReview, deleteReview } = require('../controllers/reviewController');
const { authenticate, requireAdmin } = require('../utils/authMiddleware');

// GET /api/reviews/:productId — público, cualquiera puede ver reseñas
router.get('/:productId', getProductReviews);

// POST /api/reviews/:productId — solo usuarios autenticados que compraron
router.post('/:productId', authenticate, createReview);

// DELETE /api/reviews/:id — solo el autor o admin
router.delete('/:id', authenticate, deleteReview);

module.exports = router;