const Wishlist = require('../models/wishlist');
const Product  = require('../models/product');

// Obtener lista de deseos del usuario
const getWishlist = async (userId) => {
  const items = await Wishlist.findAll({
    where: { user_id: userId },
    include: [{ model: Product, attributes: ['id','nombre','sku','categoria','precio_venta','stock_actual'] }],
    order: [['fecha', 'DESC']],
  });
  return items;
};

// Agregar producto a la lista
const addToWishlist = async (userId, productId) => {
  const [item, created] = await Wishlist.findOrCreate({
    where: { user_id: userId, product_id: productId },
    defaults: { user_id: userId, product_id: productId },
  });
  if (!created) throw new Error('El producto ya está en tu lista de deseos');
  return item;
};

// Eliminar producto de la lista
const removeFromWishlist = async (userId, productId) => {
  const deleted = await Wishlist.destroy({
    where: { user_id: userId, product_id: productId },
  });
  if (!deleted) throw new Error('Producto no encontrado en tu lista');
};

// Verificar si un producto está en la lista
const isInWishlist = async (userId, productId) => {
  const item = await Wishlist.findOne({ where: { user_id: userId, product_id: productId } });
  return !!item;
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, isInWishlist };