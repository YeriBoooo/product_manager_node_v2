const orderService = require('../services/orderService');
const audit        = require('../services/auditService');
const PDFDocument  = require('pdfkit');

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

const getMyOrders = async (req, res) => {
  try {
    const data = await orderService.getMyOrders(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const data = await orderService.getMyOrderById(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.message === 'Orden no encontrada' ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const cancelMyOrder = async (req, res) => {
  try {
    const data = await orderService.cancelMyOrder(req.params.id, req.user.id);

    await audit.registrar({
      accion:     'ORDER_STATUS_CHANGE',
      user_id:    req.user?.id,
      user_email: req.user?.email,
      user_rol:   req.user?.rol,
      entidad:    'order',
      entidad_id: parseInt(req.params.id),
      detalle:    { estado_nuevo: 'cancelada', origen: 'cliente' },
      ip:         getIP(req),
    });

    return res.status(200).json({ success: true, data, message: 'Orden cancelada correctamente' });
  } catch (error) {
    const status = error.message === 'Orden no encontrada' ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, userId, page, limit } = req.query;
    const data = await orderService.getAllOrders({ estado, fechaDesde, fechaHasta, userId, page, limit });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const data = await orderService.getOrderById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.message === 'Orden no encontrada' ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ success: false, message: 'El campo "estado" es requerido' });

    const data = await orderService.updateOrderStatus(req.params.id, estado);

    await audit.registrar({
      accion:     'ORDER_STATUS_CHANGE',
      user_id:    req.user?.id,
      user_email: req.user?.email,
      user_rol:   req.user?.rol,
      entidad:    'order',
      entidad_id: parseInt(req.params.id),
      detalle:    { estado_nuevo: estado, origen: 'admin' },
      ip:         getIP(req),
    });

    return res.status(200).json({ success: true, data, message: `Estado actualizado a "${estado}"` });
  } catch (error) {
    const status = error.message === 'Orden no encontrada' ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

const downloadFactura = async (req, res) => {
  try {
    const order = await orderService.getMyOrderById(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-orden-${order.id}.pdf`);
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(20).font('Helvetica-Bold')
      .fillColor('#c96b5f')
      .text('FACTURA DE COMPRA', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#888888')
      .text('Sistema de Gestión de Productos — PYMES Inventory', { align: 'center' });
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
    doc.moveDown(0.8);

    // ── Info orden ──
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1c1714').text('DATOS DE LA ORDEN');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#444444')
      .text(`N° Orden:  #${order.id}`)
      .text(`Fecha:     ${new Date(order.fecha || order.createdAt).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' })}`)
      .text(`Estado:    ${(order.estado || '').toUpperCase()}`)
      .text(`Cliente:   ${order.User?.nombre || order.usuario?.nombre || req.user.nombre || 'N/A'}`)
      .text(`Email:     ${order.User?.email  || order.usuario?.email  || req.user.email  || 'N/A'}`);
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
    doc.moveDown(0.8);

    // ── Tabla productos — encabezado ──
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1c1714').text('DETALLE DE PRODUCTOS');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 22).fill('#c96b5f');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text('Producto',     60,  tableTop + 7)
      .text('Cant.',        330, tableTop + 7)
      .text('Precio Unit.', 375, tableTop + 7)
      .text('Subtotal',     465, tableTop + 7);

    let y = tableTop + 26;
    let totalCalculado = 0;

    const items = order.OrderItems || order.items || order.orderItems || [];

    items.forEach((item, idx) => {
      const nombre    = item.Product?.nombre || item.producto?.nombre || item.nombre || 'Producto';
      const cantidad  = item.cantidad || 1;
      const precio    = parseFloat(item.precio_unitario || 0);
      const itemSub   = precio * cantidad;
      totalCalculado += itemSub;

      const rowColor = idx % 2 === 0 ? '#fafafa' : '#ffffff';
      doc.rect(50, y - 4, 500, 22).fill(rowColor);

      doc.fontSize(9).font('Helvetica').fillColor('#333333')
        .text(nombre,                       60,  y, { width: 260 })
        .text(String(cantidad),             330, y)
        .text(`S/ ${precio.toFixed(2)}`,   375, y)
        .text(`S/ ${itemSub.toFixed(2)}`,  465, y);

      y += 24;
    });

    doc.y = y + 8;
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
    doc.moveDown(0.8);

    // ── Totales ──
    const total = parseFloat(order.total || totalCalculado);
    const igv   = total * 0.18;
    const base  = total - igv;

    doc.fontSize(10).font('Helvetica').fillColor('#444444');

    const col1 = 370, col2 = 550;
    const lineH = 18;
    let ty = doc.y;

    doc.text('Subtotal (sin IGV):', col1, ty)
       .text(`S/ ${base.toFixed(2)}`, col1, ty, { width: col2 - col1, align: 'right' });
    ty += lineH;
    doc.text('IGV (18%):', col1, ty)
       .text(`S/ ${igv.toFixed(2)}`, col1, ty, { width: col2 - col1, align: 'right' });
    ty += lineH + 4;

    doc.rect(col1 - 5, ty - 4, col2 - col1 + 10, 24).fill('#f9eeec');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#c96b5f')
      .text('TOTAL:', col1, ty)
      .text(`S/ ${total.toFixed(2)}`, col1, ty, { width: col2 - col1, align: 'right' });

    doc.y = ty + 36;
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
    doc.moveDown(0.8);

    // ── Footer ──
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text('Gracias por su compra. Este documento es su comprobante de pago.', { align: 'center' })
      .text(`Generado el ${new Date().toLocaleString('es-PE')}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Error generando factura:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  downloadFactura,
};