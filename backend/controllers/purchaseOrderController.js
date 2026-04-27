const PurchaseOrder     = require('../models/purchaseOrder');
const PurchaseOrderItem = require('../models/purchaseOrderItem');
const Supplier          = require('../models/supplier');
const Product           = require('../models/product');

// ── Asociaciones ──────────────────────────────────────────────────────────
if (!PurchaseOrder.associations.PurchaseOrderItem) {
  PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id' });
}
if (!PurchaseOrderItem.associations.PurchaseOrder) {
  PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
}
if (!PurchaseOrder.associations.Supplier) {
  PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });
}
if (!PurchaseOrderItem.associations.Product) {
  PurchaseOrderItem.belongsTo(Product, { foreignKey: 'product_id' });
}

// ── Generar número de orden automático ────────────────────────────────────
const generarNumeroOrden = async () => {
  const count = await PurchaseOrder.count();
  const numero = String(count + 1).padStart(6, '0');
  return `OC-${numero}`;
};

/* ═══════════════════════════════════════════════
   GET /api/purchase-orders
   Lista todas las órdenes de compra
═══════════════════════════════════════════════ */
const getAll = async (req, res) => {
  try {
    const { estado, supplier_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (estado)      where.estado      = estado;
    if (supplier_id) where.supplier_id = supplier_id;

    const offset = (page - 1) * limit;
    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, attributes: ['id', 'nombre', 'contacto', 'email'] },
        {
          model: PurchaseOrderItem,
          include: [{ model: Product, attributes: ['id', 'nombre', 'sku'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      total: count,
      page:  parseInt(page),
      limit: parseInt(limit),
      data:  rows
    });
  } catch (err) {
    console.error('Error en getAll purchase orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════
   GET /api/purchase-orders/:id
   Detalle de una orden de compra
═══════════════════════════════════════════════ */
const getById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, attributes: ['id', 'nombre', 'contacto', 'email', 'telefono', 'direccion'] },
        {
          model: PurchaseOrderItem,
          include: [{ model: Product, attributes: ['id', 'nombre', 'sku', 'precio_compra', 'stock_actual'] }]
        }
      ]
    });

    if (!order) return res.status(404).json({ success: false, error: 'Orden de compra no encontrada' });

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error en getById purchase order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════
   POST /api/purchase-orders
   Crear nueva orden de compra
═══════════════════════════════════════════════ */
const create = async (req, res) => {
  try {
    const { supplier_id, items, fecha_esperada, notas } = req.body;

    // Validaciones básicas
    if (!supplier_id) return res.status(400).json({ success: false, error: 'supplier_id es requerido' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'Debes agregar al menos un producto' });

    // Verificar que el proveedor existe
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });

    // Verificar productos y calcular totales
    let subtotal = 0;
    const itemsValidados = [];

    for (const item of items) {
      if (!item.product_id || !item.cantidad_pedida || !item.precio_unitario) {
        return res.status(400).json({ success: false, error: 'Cada item requiere product_id, cantidad_pedida y precio_unitario' });
      }
      const product = await Product.findByPk(item.product_id);
      if (!product) return res.status(404).json({ success: false, error: `Producto ${item.product_id} no encontrado` });

      const itemSubtotal = parseFloat(item.precio_unitario) * parseInt(item.cantidad_pedida);
      subtotal += itemSubtotal;
      itemsValidados.push({
        product_id:       product.id,
        cantidad_pedida:  parseInt(item.cantidad_pedida),
        cantidad_recibida: 0,
        precio_unitario:  parseFloat(item.precio_unitario),
        subtotal:         itemSubtotal
      });
    }

    const impuesto = parseFloat((subtotal * 0.18).toFixed(2)); // IGV 18%
    const total    = parseFloat((subtotal + impuesto).toFixed(2));

    // Crear orden
    const numero_orden = await generarNumeroOrden();
    const order = await PurchaseOrder.create({
      supplier_id,
      numero_orden,
      estado: 'borrador',
      fecha_esperada: fecha_esperada || null,
      subtotal:       parseFloat(subtotal.toFixed(2)),
      impuesto,
      total,
      notas:          notas || null,
      creado_por:     req.user?.id || null
    });

    // Crear items
    for (const item of itemsValidados) {
      await PurchaseOrderItem.create({ purchase_order_id: order.id, ...item });
    }

    // Devolver orden completa
    const orderCompleta = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, attributes: ['id', 'nombre', 'email'] },
        { model: PurchaseOrderItem, include: [{ model: Product, attributes: ['id', 'nombre', 'sku'] }] }
      ]
    });

    res.status(201).json({ success: true, data: orderCompleta });
  } catch (err) {
    console.error('Error en create purchase order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════
   PATCH /api/purchase-orders/:id/estado
   Cambiar estado de la orden
═══════════════════════════════════════════════ */
const updateEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const ESTADOS = ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada'];

    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ success: false, error: `Estado inválido. Debe ser: ${ESTADOS.join(', ')}` });
    }

    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Orden no encontrada' });

    if (order.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'No se puede modificar una orden cancelada' });
    }
    if (order.estado === 'recibida') {
      return res.status(400).json({ success: false, error: 'No se puede modificar una orden ya recibida' });
    }

    order.estado = estado;
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error en updateEstado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════
   POST /api/purchase-orders/:id/recibir
   Registrar recepción de mercadería → actualiza stock
═══════════════════════════════════════════════ */
const recibirMercaderia = async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem }]
    });

    if (!order) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    if (order.estado === 'cancelada') return res.status(400).json({ success: false, error: 'Orden cancelada' });
    if (order.estado === 'recibida')  return res.status(400).json({ success: false, error: 'Orden ya fue recibida completamente' });

    const { items } = req.body; // [{ purchase_order_item_id, cantidad_recibida }]
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Debes indicar los items recibidos' });
    }

    let todosRecibidos = true;

    for (const recepcion of items) {
      const item = order.PurchaseOrderItems.find(i => i.id === recepcion.purchase_order_item_id);
      if (!item) continue;

      const cantidadNueva = parseInt(recepcion.cantidad_recibida);
      if (cantidadNueva <= 0) continue;

      // Actualizar cantidad recibida
      item.cantidad_recibida = Math.min(
        item.cantidad_recibida + cantidadNueva,
        item.cantidad_pedida
      );
      await item.save();

      // Incrementar stock del producto
      await Product.increment('stock_actual', {
        by:    cantidadNueva,
        where: { id: item.product_id }
      });

      if (item.cantidad_recibida < item.cantidad_pedida) todosRecibidos = false;
    }

    // Actualizar estado de la orden
    order.estado          = todosRecibidos ? 'recibida' : 'parcial';
    order.fecha_recepcion = new Date();
    await order.save();

    res.json({
      success: true,
      message: todosRecibidos ? 'Mercadería recibida completamente' : 'Recepción parcial registrada',
      data:    order
    });
  } catch (err) {
    console.error('Error en recibirMercaderia:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ═══════════════════════════════════════════════
   DELETE /api/purchase-orders/:id
   Solo cancela si está en borrador
═══════════════════════════════════════════════ */
const cancel = async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Orden no encontrada' });

    if (order.estado !== 'borrador') {
      return res.status(400).json({ success: false, error: 'Solo se pueden cancelar órdenes en estado borrador' });
    }

    order.estado = 'cancelada';
    await order.save();

    res.json({ success: true, message: 'Orden cancelada', data: order });
  } catch (err) {
    console.error('Error en cancel purchase order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getById, create, updateEstado, recibirMercaderia, cancel };