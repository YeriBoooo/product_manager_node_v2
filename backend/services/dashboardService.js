const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const Product   = require('../models/product');
const Order     = require('../models/order');
const OrderItem = require('../models/orderItem');
const Cart      = require('../models/cart');
const User      = require('../models/user');

if (!OrderItem.associations.Product) {
  OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
}
if (!Order.associations.OrderItem) {
  Order.hasMany(OrderItem, { foreignKey: 'order_id' });
}
if (!OrderItem.associations.Order) {
  OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
}

const getDashboardData = async () => {
  const now       = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  console.log('DASHBOARD START', startDate);

  const totalProducts = await Product.count();
  const allProducts   = await Product.findAll({
    attributes: ['precio_venta', 'stock_actual'],
    raw: true,
  });
  const totalInventoryValue = allProducts.reduce(
    (sum, p) => sum + parseFloat(p.precio_venta) * parseInt(p.stock_actual), 0
  );
  const reorderProducts = await Product.findAll({
    where: sequelize.where(sequelize.col('stock_actual'), Op.lte, sequelize.col('stock_minimo')),
    attributes: ['sku', 'nombre', 'stock_actual', 'stock_minimo', 'proveedor'],
    order: [['stock_actual', 'ASC']],
    raw: true,
  });
  const lowStockProducts    = reorderProducts.length;
  const mostValuableProduct = allProducts.reduce((best, p) => {
    const valor = parseFloat(p.precio_venta) * parseInt(p.stock_actual);
    return valor > (best?.valor || 0) ? { nombre: p.nombre, valor } : best;
  }, null);
  const categoryGroups = await Product.findAll({
    attributes: ['categoria', [fn('COUNT', col('id')), 'count']],
    group: ['categoria'],
    order: [[sequelize.literal('count'), 'DESC']],
    raw: true,
  });
  const topCategories        = categoryGroups.map(c => ({ name: c.categoria, count: parseInt(c.count) }));
  const categoryDistribution = categoryGroups.map(c => ({ name: c.categoria, value: parseInt(c.count) }));

  let totalOrdenes = 0, totalVentas = 0, ticketPromedio = 0;
  let ordenesPendientes = 0, tasaAbandono = 0, clientesNuevos = 0;
  let totalReembolsos = { cantidad: 0, monto: 0 };

  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) as total_ordenes, COALESCE(SUM(total), 0) as total_ventas
       FROM orders
       WHERE estado NOT IN ('cancelada', 'devuelta')
       AND fecha >= :startDate`,
      { replacements: { startDate }, type: sequelize.QueryTypes.SELECT }
    );
    const row    = result[0];
    totalOrdenes   = parseInt(row.total_ordenes || 0);
    totalVentas    = parseFloat(row.total_ventas || 0);
    ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
    console.log('ORDENES OK:', totalOrdenes, totalVentas);
  } catch (err) { console.error('ERROR ORDENES:', err.message); }

  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) as total FROM orders WHERE estado IN ('pendiente', 'pendiente_pago')`,
      { type: sequelize.QueryTypes.SELECT }
    );
    ordenesPendientes = parseInt(result[0].total || 0);
    console.log('PENDIENTES OK:', ordenesPendientes);
  } catch (err) { console.error('ERROR PENDIENTES:', err.message); }

  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as monto
       FROM orders WHERE estado IN ('cancelada', 'devuelta') AND fecha >= :startDate`,
      { replacements: { startDate }, type: sequelize.QueryTypes.SELECT }
    );
    totalReembolsos = {
      cantidad: parseInt(result[0].cantidad || 0),
      monto:    parseFloat(result[0].monto || 0),
    };
  } catch (err) { console.error('ERROR REEMBOLSOS:', err.message); }

  try {
    const totalCarritos = await Cart.count({ where: { createdAt: { [Op.gte]: startDate } } });
    if (totalCarritos > 0) {
      tasaAbandono = Math.max(0, Math.min(100, ((totalCarritos - totalOrdenes) / totalCarritos) * 100));
    }
    console.log('CARRITOS OK:', totalCarritos, 'abandono:', tasaAbandono);
  } catch (err) { console.error('ERROR CARRITOS:', err.message); }

  try {
    clientesNuevos = await User.count({ where: { createdAt: { [Op.gte]: startDate } } });
    console.log('CLIENTES OK:', clientesNuevos);
  } catch (err) { console.error('ERROR CLIENTES:', err.message); }

  let ventasDiarias = [];
  try {
    const rows = await sequelize.query(
      `SELECT DATE(fecha) as dia, SUM(total) as monto
       FROM orders
       WHERE estado NOT IN ('cancelada') AND fecha >= :startDate
       GROUP BY DATE(fecha) ORDER BY DATE(fecha) ASC`,
      { replacements: { startDate }, type: sequelize.QueryTypes.SELECT }
    );
    ventasDiarias = rows.map(v => ({
      fecha: new Date(v.dia).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
      monto: parseFloat(v.monto || 0),
    }));
    console.log('VENTAS DIARIAS OK:', ventasDiarias.length);
  } catch (err) { console.error('ERROR VENTAS DIARIAS:', err.message); }

  let ordenesPorEstado = [];
  try {
    const rows = await sequelize.query(
      `SELECT estado, COUNT(*) as value FROM orders GROUP BY estado`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
    ordenesPorEstado = rows.map(e => ({ name: cap(e.estado), value: parseInt(e.value || 0) }));
    console.log('ESTADOS OK:', ordenesPorEstado.length);
  } catch (err) { console.error('ERROR ESTADOS:', err.message); }

  let topProductos = [];
  try {
    const rows = await sequelize.query(
      `SELECT oi.product_id, SUM(oi.cantidad) as vendidos, p.nombre
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       GROUP BY oi.product_id, p.nombre
       ORDER BY vendidos DESC LIMIT 10`,
      { type: sequelize.QueryTypes.SELECT }
    );
    topProductos = rows.map(r => ({ nombre: r.nombre, vendidos: parseInt(r.vendidos || 0) }));
    console.log('TOP PRODUCTOS OK:', topProductos.length);
  } catch (err) { console.error('ERROR TOP PRODUCTOS:', err.message); }

  console.log('DASHBOARD END - ventas:', totalVentas, 'ordenes:', totalOrdenes);

  return {
    kpis: {
      totalProducts, totalInventoryValue, lowStockProducts, mostValuableProduct,
      totalVentas, totalOrdenes, ticketPromedio, tasaAbandono, clientesNuevos,
      ordenesPendientes, totalReembolsos,
    },
    charts: { topCategories, categoryDistribution, ventasDiarias, ordenesPorEstado, topProductos },
    reorderProducts,
  };
};

module.exports = { getDashboardData };  