const Coupon = require('../models/coupon');

// ✅ VALIDAR Y APLICAR CUPÓN
const validateCoupon = async (req, res) => {
  try {
    const { codigo, monto } = req.body;

    if (!codigo || !monto) {
      return res.status(400).json({ error: 'Código y monto requeridos' });
    }

    // Buscar cupón
    const coupon = await Coupon.findOne({
      where: { 
        codigo: codigo.toUpperCase(),
        activo: true
      }
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no válido' });
    }

    // Validar fechas
    const ahora = new Date();
    if (ahora < coupon.fecha_inicio || ahora > coupon.fecha_fin) {
      return res.status(400).json({ error: 'Cupón expirado' });
    }

    // Validar usos
    if (coupon.usos_maximos && coupon.usos_actuales >= coupon.usos_maximos) {
      return res.status(400).json({ error: 'Cupón agotado' });
    }

    // Validar monto mínimo
    if (parseFloat(monto) < parseFloat(coupon.monto_minimo)) {
      return res.status(400).json({ 
        error: `Monto mínimo: S/ ${coupon.monto_minimo}` 
      });
    }

    // Calcular descuento
    let descuento = 0;
    if (coupon.tipo_descuento === 'porcentaje') {
      descuento = (parseFloat(monto) * parseFloat(coupon.valor_descuento)) / 100;
    } else {
      descuento = parseFloat(coupon.valor_descuento);
    }

    const montoFinal = parseFloat(monto) - descuento;

    res.json({
      valido: true,
      codigo: coupon.codigo,
      descripcion: coupon.descripcion,
      tipo_descuento: coupon.tipo_descuento,
      valor_descuento: coupon.valor_descuento,
      descuento,
      monto_original: parseFloat(monto),
      monto_final: montoFinal,
      ahorro: descuento
    });

  } catch (err) {
    console.error('Error validando cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ USAR CUPÓN (después de checkout exitoso)
const useCoupon = async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({ error: 'Código requerido' });
    }

    const coupon = await Coupon.findOne({
      where: { codigo: codigo.toUpperCase() }
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    // Incrementar uso
    coupon.usos_actuales += 1;
    await coupon.save();

    res.json({
      message: 'Cupón utilizado correctamente',
      usos_actuales: coupon.usos_actuales,
      usos_maximos: coupon.usos_maximos
    });

  } catch (err) {
    console.error('Error usando cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ CREAR CUPÓN (solo admin)
const createCoupon = async (req, res) => {
  try {
    const { codigo, descripcion, tipo_descuento, valor_descuento, monto_minimo, usos_maximos, fecha_inicio, fecha_fin } = req.body;

    if (!codigo || !tipo_descuento || !valor_descuento || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Campos requeridos incompletos' });
    }

    const coupon = await Coupon.create({
      codigo: codigo.toUpperCase(),
      descripcion,
      tipo_descuento,
      valor_descuento,
      monto_minimo: monto_minimo || 0,
      usos_maximos,
      fecha_inicio,
      fecha_fin
    });

    res.status(201).json({
      message: 'Cupón creado exitosamente',
      coupon
    });

  } catch (err) {
    console.error('Error creando cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ LISTAR CUPONES (solo admin)
const getAllCoupons = async (req, res) => {
  try {
    const { activo } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const coupons = await Coupon.findAll({ where, order: [['fecha_creacion', 'DESC']] });

    res.json({
      total: coupons.length,
      coupons
    });

  } catch (err) {
    console.error('Error listando cupones:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENER CUPÓN POR ID (solo admin)
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    res.json(coupon);

  } catch (err) {
    console.error('Error obteniendo cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ ACTUALIZAR CUPÓN (solo admin)
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    await coupon.update(req.body);

    res.json({
      message: 'Cupón actualizado',
      coupon
    });

  } catch (err) {
    console.error('Error actualizando cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ ELIMINAR CUPÓN (solo admin)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    await coupon.destroy();

    res.json({ message: 'Cupón eliminado' });

  } catch (err) {
    console.error('Error eliminando cupón:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  validateCoupon,
  useCoupon,
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
};