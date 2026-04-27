const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const Product   = require('../models/product');
const Order     = require('../models/order');
const OrderItem = require('../models/orderItem');
const Cart      = require('../models/cart');
const User      = require('../models/user');

// Asegura asociaciones
if (!Order.associations.OrderItem) Order.hasMany(OrderItem, { foreignKey: 'order_id' });
if (!OrderItem.associations.Product) OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
if (!Order.associations.User) Order.belongsTo(User, { foreignKey: 'user_id' });

/* ═══════════════════════════════════════════════
   1. ANÁLISIS ABC
   Clasifica productos por volumen de ventas
   A = top 80% de ventas acumuladas
   B = siguiente 15%
   C = último 5%
═══════════════════════════════════════════════ */
const getAnalisisABC = async () => {
  const rows = await OrderItem.findAll({
    attributes: [
      'product_id',
      [fn('SUM', col('OrderItem.cantidad')), 'unidades'],
      [fn('SUM', literal('"OrderItem"."precio_unitario" * "OrderItem"."cantidad"')), 'revenue'],
    ],
    include: [{ model: Product, attributes: ['nombre', 'sku', 'categoria'] }],
    group: ['OrderItem.product_id', 'Product.id'],
    order: [[literal('"revenue"'), 'DESC']],
    raw: true,
    nest: true,
  });

  const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
  let acumulado = 0;

  const productos = rows.map(r => {
    const revenue = parseFloat(r.revenue);
    acumulado += revenue;
    const pct = totalRevenue > 0 ? (acumulado / totalRevenue) * 100 : 0;
    const clase = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
    return {
      product_id: r.product_id,
      nombre:     r.Product?.nombre || `#${r.product_id}`,
      sku:        r.Product?.sku || '—',
      categoria:  r.Product?.categoria || '—',
      unidades:   parseInt(r.unidades),
      revenue:    revenue,
      pct_acumulado: parseFloat(pct.toFixed(2)),
      clase,
    };
  });

  const resumen = {
    A: productos.filter(p => p.clase === 'A').length,
    B: productos.filter(p => p.clase === 'B').length,
    C: productos.filter(p => p.clase === 'C').length,
  };

  return { productos, resumen, totalRevenue };
};

/* ═══════════════════════════════════════════════
   2. ANÁLISIS RFM
   Recencia (días desde última compra)
   Frecuencia (número de órdenes)
   Monto (total gastado)
═══════════════════════════════════════════════ */
const getAnalisisRFM = async () => {
  const clientes = await Order.findAll({
    attributes: [
      'user_id',
      [fn('MAX', col('fecha')), 'ultima_compra'],
      [fn('COUNT', col('Order.id')), 'frecuencia'],
      [fn('SUM', literal('"Order"."total"')), 'monto'],
    ],
    where: { estado: { [Op.ne]: 'cancelada' } },
    include: [{ model: User, attributes: ['nombre', 'email'] }],
    group: ['Order.user_id', 'User.id'],
    raw: true,
    nest: true,
  });

  const now = new Date();

  const datos = clientes.map(c => {
    const recencia    = Math.floor((now - new Date(c.ultima_compra)) / (1000 * 60 * 60 * 24));
    const frecuencia  = parseInt(c.frecuencia);
    const monto       = parseFloat(c.monto);
    return {
      user_id:       c.user_id,
      nombre:        c.User?.nombre || `Usuario #${c.user_id}`,
      email:         c.User?.email || '—',
      recencia,
      frecuencia,
      monto,
      ultima_compra: c.ultima_compra,
    };
  });

  // Scoring 1-5 para cada dimensión
  const score = (val, arr, invertir = false) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx    = sorted.indexOf(val);
    const pct    = arr.length > 1 ? idx / (arr.length - 1) : 0;
    const s      = Math.ceil(pct * 4) + 1;
    return invertir ? 6 - s : s;
  };

  const recencias   = datos.map(d => d.recencia);
  const frecuencias = datos.map(d => d.frecuencia);
  const montos      = datos.map(d => d.monto);

  const rfm = datos.map(d => {
    const r = score(d.recencia,   recencias,   true);  // menor recencia = mejor
    const f = score(d.frecuencia, frecuencias, false);
    const m = score(d.monto,      montos,      false);
    const total = r + f + m;
    const segmento =
      total >= 12 ? 'VIP'        :
      total >= 8  ? 'Leal'       :
      total >= 5  ? 'Potencial'  : 'En riesgo';
    return { ...d, score_r: r, score_f: f, score_m: m, score_total: total, segmento };
  });

  rfm.sort((a, b) => b.score_total - a.score_total);
  return rfm;
};

/* ═══════════════════════════════════════════════
   3. TENDENCIA DE VENTAS + PRONÓSTICO LINEAL
═══════════════════════════════════════════════ */
const getTendenciaVentas = async () => {
  const hace90 = new Date();
  hace90.setDate(hace90.getDate() - 90);

  const raw = await Order.findAll({
    attributes: [
      [fn('DATE', col('fecha')), 'dia'],
      [fn('SUM', col('total')), 'monto'],
      [fn('COUNT', col('Order.id')), 'ordenes'],
    ],
    where: {
      estado: { [Op.ne]: 'cancelada' },
      fecha:  { [Op.gte]: hace90 },
    },
    group: [fn('DATE', col('fecha'))],
    order: [[fn('DATE', col('fecha')), 'ASC']],
    raw: true,
  });

  const ventas = raw.map((v, i) => ({
    dia:     new Date(v.dia).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
    monto:   parseFloat(v.monto),
    ordenes: parseInt(v.ordenes),
    x:       i,
  }));

  // Regresión lineal simple
  const n  = ventas.length;
  if (n < 2) return { ventas, pronostico: [] };

  const sumX  = ventas.reduce((s, v) => s + v.x, 0);
  const sumY  = ventas.reduce((s, v) => s + v.monto, 0);
  const sumXY = ventas.reduce((s, v) => s + v.x * v.monto, 0);
  const sumX2 = ventas.reduce((s, v) => s + v.x * v.x, 0);
  const m_    = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b     = (sumY - m_ * sumX) / n;

  // Pronóstico para los próximos 7 días
  const pronostico = [];
  for (let i = 1; i <= 7; i++) {
    const x       = n - 1 + i;
    const fecha   = new Date();
    fecha.setDate(fecha.getDate() + i);
  const valorPronostico = Math.max(0, parseFloat((m_ * x + b).toFixed(2)));
  pronostico.push({
    dia:        fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
    monto:      valorPronostico,
    pronostico: valorPronostico,   // ← este es el que lee el gráfico
    x,
    esForecast: true,
  });
  }

  return { ventas, pronostico, pendiente: m_, intercepto: b };
};

/* ═══════════════════════════════════════════════
   4. TASA DE ABANDONO DE CARRITO
═══════════════════════════════════════════════ */
const getTasaAbandono = async () => {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const totalCarritos = await Cart.count({
    where: { fecha_creacion: { [Op.gte]: hace30 } },
  });

  const carritosFinalizados = await Cart.count({
    where: {
      estado:          'finalizado',
      fecha_creacion:  { [Op.gte]: hace30 },
    },
  });

  const abandonados   = totalCarritos - carritosFinalizados;
  const tasaAbandono  = totalCarritos > 0
    ? parseFloat(((abandonados / totalCarritos) * 100).toFixed(2))
    : 0;
  const tasaConversion = totalCarritos > 0
    ? parseFloat(((carritosFinalizados / totalCarritos) * 100).toFixed(2))
    : 0;

  // Abandono por día
  const porDia = await Cart.findAll({
    attributes: [
      [fn('DATE', col('fecha_creacion')), 'dia'],
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal("CASE WHEN estado = 'finalizado' THEN 1 ELSE 0 END")), 'finalizados'],
    ],
    where: { fecha_creacion: { [Op.gte]: hace30 } },
    group: [fn('DATE', col('fecha_creacion'))],
    order: [[fn('DATE', col('fecha_creacion')), 'ASC']],
    raw: true,
  });

  const tendenciaAbandono = porDia.map(d => ({
    dia:         new Date(d.dia).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
    total:       parseInt(d.total),
    finalizados: parseInt(d.finalizados),
    abandonados: parseInt(d.total) - parseInt(d.finalizados),
  }));

  return {
    totalCarritos,
    carritosFinalizados,
    abandonados,
    tasaAbandono,
    tasaConversion,
    tendenciaAbandono,
  };
};

/* ═══════════════════════════════════════════════
   RESPUESTA COMPLETA
═══════════════════════════════════════════════ */
const getAllStats = async () => {
  const [abc, rfm, tendencia, abandono] = await Promise.all([
    getAnalisisABC(),
    getAnalisisRFM(),
    getTendenciaVentas(),
    getTasaAbandono(),
  ]);
  return { abc, rfm, tendencia, abandono };
};

module.exports = {
  getAllStats,
  getAnalisisABC,
  getAnalisisRFM,
  getTendenciaVentas,
  getTasaAbandono,
};