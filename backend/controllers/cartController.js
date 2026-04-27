const Cart      = require('../models/cart');
const CartItem  = require('../models/cartItem');
const Product   = require('../models/product');
const Order     = require('../models/order');
const OrderItem = require('../models/orderItem');
const {
  reservarStock      : reservarStockService,
  liberarReservasUsuario,
  confirmarReservas,
} = require('../services/stockReservationService');

/* ─────────────────────────────────────────────
   GET /api/cart
───────────────────────────────────────────── */
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      where: { user_id: req.user.id, estado: 'activo' },
      include: [{ model: CartItem, include: [{ model: Product, attributes: ['id', 'nombre', 'precio_venta', 'stock_actual'] }] }]
    });
    if (!cart) { cart = await Cart.create({ user_id: req.user.id }); cart.CartItems = []; }
    res.json(cart);
  } catch (err) { console.error('Error en getCart:', err); res.status(500).json({ error: err.message }); }
};

/* ─────────────────────────────────────────────
   POST /api/cart/items
───────────────────────────────────────────── */
const addItem = async (req, res) => {
  try {
    const { product_id, cantidad } = req.body;
    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.stock_actual < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    let cart = await Cart.findOne({ where: { user_id: req.user.id, estado: 'activo' } });
    if (!cart) cart = await Cart.create({ user_id: req.user.id });
    let item = await CartItem.findOne({ where: { cart_id: cart.id, product_id } });
    if (item) { item.cantidad += cantidad; await item.save(); }
    else { item = await CartItem.create({ cart_id: cart.id, product_id, cantidad, precio_unitario: product.precio_venta }); }
    res.status(201).json(item);
  } catch (err) { console.error('Error en addItem:', err); res.status(500).json({ error: err.message }); }
};

/* ─────────────────────────────────────────────
   DELETE /api/cart/items/:id
───────────────────────────────────────────── */
const removeItem = async (req, res) => {
  try {
    const item = await CartItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    await item.destroy();
    res.json({ message: 'Item eliminado' });
  } catch (err) { console.error('Error en removeItem:', err); res.status(500).json({ error: err.message }); }
};

/* ─────────────────────────────────────────────
   POST /api/cart/reservar-stock
   — Llamado al avanzar del paso 0 del checkout
───────────────────────────────────────────── */
const reservarStock = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener items del carrito del usuario desde la BD
    const cart = await Cart.findOne({
      where: { user_id: userId, estado: 'activo' },
      include: [{ model: CartItem, include: [{ model: Product }] }],
    });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const items = cart.CartItems.map(ci => ({
      id:       ci.product_id,
      product_id: ci.product_id,
      cantidad: ci.cantidad,
      nombre:   ci.Product?.nombre || `Producto ${ci.product_id}`,
    }));

    const resultado = await reservarStockService(userId, items);

    return res.status(200).json({
      success:  true,
      message:  `Stock reservado por ${resultado.minutos} minutos`,
      expira_en: resultado.expira_en,
      minutos:  resultado.minutos,
    });

  } catch (err) {
    console.error('❌ Error en reservarStock:', err.message);

    // El servicio lanza el error con el detalle de productos sin stock
    return res.status(400).json({
      error:   'No se pudo reservar el stock',
      details: err.message,
    });
  }
};

/* ─────────────────────────────────────────────
   DELETE /api/cart/reservar-stock
   — Liberar reserva si el usuario abandona el checkout
───────────────────────────────────────────── */
const liberarReserva = async (req, res) => {
  try {
    await liberarReservasUsuario(req.user.id);
    return res.status(200).json({ success: true, message: 'Reserva liberada' });
  } catch (err) {
    console.error('❌ Error en liberarReserva:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/cart/checkout
───────────────────────────────────────────── */
const checkout = async (req, res) => {
  try {
    console.log('\n=== CHECKOUT INICIADO ===');
    console.log('Usuario ID:', req.user?.id);
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));

    const { shippingAddress, shippingMethod, paymentMethod, paymentDetails, items } = req.body;

    // 1. VALIDAR ITEMS
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }
    console.log(`Items recibidos desde frontend: ${items.length}`);

    // 2. VALIDAR DIRECCIÓN
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Error de validación', details: 'shippingAddress es requerida' });
    }
    const { nombre, email, telefono, direccion, ciudad, departamento, codigoPostal } = shippingAddress;
    const validationErrors = [];
    if (!nombre       || nombre.trim().length < 3)         validationErrors.push('nombre inválido (mínimo 3 caracteres)');
    if (!email        || !email.includes('@'))              validationErrors.push('email inválido');
    if (!telefono     || telefono.trim().length < 9)       validationErrors.push('teléfono inválido');
    if (!direccion    || direccion.trim().length < 5)      validationErrors.push('dirección inválida');
    if (!ciudad       || ciudad.trim().length < 2)         validationErrors.push('ciudad inválida');
    if (!departamento || departamento.trim().length < 2)   validationErrors.push('departamento inválido');
    if (!codigoPostal || codigoPostal.trim().length < 3)   validationErrors.push('código postal inválido');
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Error de validación en dirección de envío', details: validationErrors });
    }

    // 3. VALIDAR ENVÍO
    const validShippingMethods = ['standard', 'express', 'pickup'];
    if (!shippingMethod || !validShippingMethods.includes(shippingMethod)) {
      return res.status(400).json({ error: 'Error de validación', details: `shippingMethod debe ser: ${validShippingMethods.join(', ')}` });
    }

    // 4. VALIDAR PAGO
    const validPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Error de validación', details: `paymentMethod debe ser: ${validPaymentMethods.join(', ')}` });
    }

    // 5. VALIDAR TARJETA SI APLICA
    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (!paymentDetails) return res.status(400).json({ error: 'paymentDetails requerida para tarjeta' });
      const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = paymentDetails;
      const pe = [];
      if (!cardNumber     || cardNumber.replace(/\s/g, '').length !== 16) pe.push('cardNumber debe tener 16 dígitos');
      if (!expiryMonth    || expiryMonth < 1 || expiryMonth > 12)         pe.push('expiryMonth inválido');
      if (!expiryYear     || expiryYear < new Date().getFullYear())        pe.push('expiryYear inválido');
      if (!cvv            || cvv.length !== 3)                             pe.push('cvv debe tener 3 dígitos');
      if (!cardholderName || cardholderName.trim().length < 3)             pe.push('cardholderName inválido');
      if (pe.length > 0) return res.status(400).json({ error: 'Error en datos de tarjeta', details: pe });
    }

    // 6. VALIDAR STOCK EN DB Y OBTENER PRECIOS REALES
    console.log('\n✓ Validando stock...');
    const itemsValidados = [];
    for (const item of items) {
      const product = await Product.findByPk(item.id);
      if (!product) return res.status(400).json({ error: `Producto "${item.nombre}" ya no existe` });
      if (product.stock_actual < item.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para "${product.nombre}". Disponible: ${product.stock_actual}, solicitado: ${item.cantidad}`
        });
      }
      itemsValidados.push({
        product_id:      product.id,
        cantidad:        item.cantidad,
        precio_unitario: parseFloat(product.precio_venta),
      });
    }

    // 7. CALCULAR TOTALES
    const subtotal      = itemsValidados.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);
    const shippingCosts = { standard: 10, express: 25, pickup: 0 };
    const shippingCost  = shippingCosts[shippingMethod] || 0;
    const total         = subtotal + shippingCost;
    console.log(`Subtotal: ${subtotal} | Envío: ${shippingCost} | Total: ${total}`);

    // 8. CREAR ORDEN
    console.log('\n✓ Creando orden...');
    const order = await Order.create({
      user_id: req.user.id, total, subtotal,
      shipping_cost: shippingCost, shipping_method: shippingMethod, payment_method: paymentMethod,
      shipping_address_nombre: nombre, shipping_address_email: email,
      shipping_address_telefono: telefono, shipping_address_direccion: direccion,
      shipping_address_ciudad: ciudad, shipping_address_departamento: departamento,
      shipping_address_codigo_postal: codigoPostal,
      estado: 'pendiente_pago',
    });
    console.log(`✓ Orden creada: ID ${order.id}`);

    // 9. ITEMS + DESCONTAR STOCK
    console.log('\n✓ Agregando items y descontando stock...');
    for (const item of itemsValidados) {
      await OrderItem.create({ order_id: order.id, product_id: item.product_id, cantidad: item.cantidad, precio_unitario: item.precio_unitario });
      await Product.decrement('stock_actual', { by: item.cantidad, where: { id: item.product_id } });
      console.log(`  ✓ Producto ${item.product_id} → -${item.cantidad} stock`);
    }

    // 10. CONFIRMAR RESERVAS — evita que el cron libere stock ya vendido
    await confirmarReservas(req.user.id);
    console.log('✓ Reservas confirmadas');

    // 11. RESPUESTA
    console.log('\n✅ CHECKOUT EXITOSO');
    return res.status(201).json({
      message: 'Pedido creado exitosamente',
      order_id: order.id, order_number: order.id,
      subtotal:     parseFloat(subtotal.toFixed(2)),
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      total:        parseFloat(total.toFixed(2)),
      shippingAddress: { nombre, email, telefono, direccion, ciudad, departamento, codigoPostal },
      items: itemsValidados,
    });

  } catch (err) {
    console.error('\n❌ ERROR EN CHECKOUT:', err);
    return res.status(500).json({ error: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
};

module.exports = { getCart, addItem, removeItem, checkout, reservarStock, liberarReserva };