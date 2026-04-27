const reviewService = require('../services/reviewService');

const getProductReviews = async (req, res) => {
  try {
    const data = await reviewService.getProductReviews(req.params.productId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createReview = async (req, res) => {
  try {
    const { rating, comentario } = req.body;
    if (!rating) return res.status(400).json({ success: false, message: 'El rating es requerido' });
    const data = await reviewService.createReview({
      userId:     req.user.id,
      productId:  req.params.productId,
      rating:     parseInt(rating),
      comentario,
    });
    return res.status(201).json({ success: true, data, message: 'Reseña creada correctamente' });
  } catch (error) {
    const status = error.message.includes('permiso') || error.message.includes('comprado') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    await reviewService.deleteReview(req.params.id, req.user.id, req.user.rol);
    return res.status(200).json({ success: true, message: 'Reseña eliminada' });
  } catch (error) {
    const status = error.message === 'Reseña no encontrada' ? 404 : 403;
    return res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = { getProductReviews, createReview, deleteReview };