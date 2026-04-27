const { Op } = require('sequelize');
const Review  = require('../models/review');
const User    = require('../models/user');
const Order   = require('../models/order');
const OrderItem = require('../models/orderItem');

// Verificar si el usuario compró el producto
const hasPurchased = async (userId, productId) => {
  const item = await OrderItem.findOne({
    where: { product_id: productId },
    include: [{
      model: Order,
      where: {
        user_id: userId,
        estado:  { [Op.in]: ['pagada', 'en_proceso', 'enviada', 'entregada'] },
      },
    }],
  });
  return !!item;
};

// Crear reseña
const createReview = async ({ userId, productId, rating, comentario }) => {
  // Solo puede reseñar si compró
  const purchased = await hasPurchased(userId, productId);
  if (!purchased) throw new Error('Solo puedes reseñar productos que hayas comprado');

  // Solo una reseña por producto por usuario
  const existing = await Review.findOne({ where: { user_id: userId, product_id: productId } });
  if (existing) throw new Error('Ya tienes una reseña para este producto');

  const review = await Review.create({ user_id: userId, product_id: productId, rating, comentario });
  return review;
};

// Obtener reseñas de un producto
const getProductReviews = async (productId) => {
  const reviews = await Review.findAll({
    where: { product_id: productId },
    include: [{ model: User, attributes: ['id', 'nombre'] }],
    order: [['fecha', 'DESC']],
  });

  const total   = reviews.length;
  const promedio = total > 0
    ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
    : 0;

  // Distribución 1-5 estrellas
  const distribucion = [1, 2, 3, 4, 5].map(star => ({
    stars: star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  return { reviews, total, promedio, distribucion };
};

// Eliminar reseña (solo el autor o admin)
const deleteReview = async (reviewId, userId, rol) => {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new Error('Reseña no encontrada');
  if (review.user_id !== userId && rol !== 'admin') {
    throw new Error('No tienes permiso para eliminar esta reseña');
  }
  await review.destroy();
};

module.exports = { createReview, getProductReviews, deleteReview };