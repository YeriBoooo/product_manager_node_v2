const { Op } = require('sequelize');
const Order     = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product   = require('../models/product');
const User      = require('../models/user');

const VENTANA_CANCELACION_MIN = 30; // Cambia según el negocio, o usa process.env.CANCEL_WINDOW_MINUTES

// ── Asegura asociaciones ──────────────────────────────────────────────────
if (!Order.associations.OrderItem) {
  Order.hasMany(OrderItem, { foreignKey: 'order_id' });
}
if (!OrderItem.associations.Order) {
  OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
}
if (!OrderItem.associations.Product) {
  OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
}
if (!Order.associations.User) {
  Order.belongsTo(User, { foreignKey: 'user_id' });
}

/* ═══════════════════════════════════════════════
   CLIENTE — sus propias órdenes
═══════════════════════════════════════════════ */

const getMyOrders = async (userId) => {
  const orders = await Order.findAll({
    where: { user_id: userId },
    include: [{
      model: OrderItem,
      include: [{ model: Product, attributes: ['nombre', 'precio_venta'] }],
    }],
    order: [['fecha', 'DESC']],
  });
  return orders;
};

const getMyOrderById = async (orderId, userId) => {
  const order = await Order.findOne({
    where: { id: orderId, user_id: userId },
    include: [{
      model: OrderItem,
      include: [{ model: Product, attributes: ['nombre', 'precio_venta', 'sku'] }],
    }],
  });
  if (!order) throw new Error('Orden no encontrada');
  return order;
};

const cancelMyOrder = async (orderId, userId) => {
  const order = await Order.findOne({ where: { id: orderId, user_id: userId } });
  if (!order) throw new Error('Orden no encontrada');

  // 1. Verificar estado cancelable
  const cancelables = ['pendiente', 'pendiente_pago'];
  if (!cancelables.includes(order.estado)) {
    throw new Error(`No se puede cancelar una orden en estado "${order.estado}"`);
  }

  // 2. Verificar ventana de tiempo
  const diffMinutos = (new Date() - new Date(order.fecha)) / 1000 / 60;
  if (diffMinutos > VENTANA_CANCELACION_MIN) {
    throw new Error(
      `La ventana de cancelación ha expirado. Solo puedes cancelar dentro de los ${VENTANA_CANCELACION_MIN} minutos de realizada la orden.`
    );
  }

  // 3. Devolver stock
  const items = await OrderItem.findAll({ where: { order_id: orderId } });
  for (const item of items) {
    await Product.increment('stock_actual', {
      by: item.cantidad,
      where: { id: item.product_id },
    });
  }

  order.estado = 'cancelada';
  await order.save();
  return order;
};

/* ═══════════════════════════════════════════════
   ADMIN — todas las órdenes
═══════════════════════════════════════════════ */

const getAllOrders = async ({ estado, fechaDesde, fechaHasta, userId, page = 1, limit = 20 }) => {
  const where = {};
  if (estado)  where.estado  = estado;
  if (userId)  where.user_id = userId;
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha[Op.gte] = new Date(fechaDesde);
    if (fechaHasta) where.fecha[Op.lte] = new Date(fechaHasta);
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: User,      attributes: ['id', 'nombre', 'email'] },
      { model: OrderItem, include: [{ model: Product, attributes: ['nombre', 'sku'] }] },
    ],
    order: [['fecha', 'DESC']],
    limit:  parseInt(limit),
    offset,
  });

  return { total: count, page: parseInt(page), limit: parseInt(limit), data: rows };
};

const getOrderById = async (orderId) => {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User,      attributes: ['id', 'nombre', 'email'] },
      { model: OrderItem, include: [{ model: Product, attributes: ['nombre', 'sku', 'precio_venta'] }] },
    ],
  });
  if (!order) throw new Error('Orden no encontrada');
  return order;
};

const ESTADOS_VALIDOS = ['pendiente', 'pendiente_pago', 'pagada', 'en_proceso', 'enviada', 'entregada', 'cancelada'];
const TRANSICIONES = {
  pendiente:      ['pagada', 'cancelada'],
  pendiente_pago: ['pagada', 'cancelada'],
  pagada:         ['en_proceso', 'cancelada'],
  en_proceso:     ['enviada', 'cancelada'],
  enviada:        ['entregada'],
  entregada:      [],
  cancelada:      [],
};

const updateOrderStatus = async (orderId, nuevoEstado) => {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    throw new Error(`Estado "${nuevoEstado}" no válido`);
  }
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error('Orden no encontrada');

  const permitidos = TRANSICIONES[order.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    throw new Error(`No se puede pasar de "${order.estado}" a "${nuevoEstado}"`);
  }

  if (nuevoEstado === 'cancelada') {
    const items = await OrderItem.findAll({ where: { order_id: orderId } });
    for (const item of items) {
      await Product.increment('stock_actual', {
        by: item.cantidad,
        where: { id: item.product_id },
      });
    }
  }

  order.estado = nuevoEstado;
  await order.save();
  return order;
};

module.exports = {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};