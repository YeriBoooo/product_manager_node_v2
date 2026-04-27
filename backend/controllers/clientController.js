const User = require('../models/user');
const Order = require('../models/order');
const { Op, fn, col, literal } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const { search, segmento, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = { rol: 'cliente', activo: true };

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { email:  { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['fecha_registro', 'DESC']],
      attributes: ['id', 'nombre', 'email', 'activo', 'fecha_registro']
    });

    // Enriquecer con datos de órdenes
    const enriched = await Promise.all(rows.map(async (u) => {
      const orders = await Order.findAll({ where: { user_id: u.id } });
      const total_gastado = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
      const ultima_compra = orders.length > 0
        ? orders.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
        : null;

      let segmento = 'nuevo';
      if (orders.length >= 10 || total_gastado >= 5000) segmento = 'vip';
      else if (orders.length >= 3) segmento = 'recurrente';
      else if (orders.length === 0) segmento = 'inactivo';

      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        activo: u.activo,
        fecha_registro: u.fecha_registro,
        total_ordenes: orders.length,
        total_gastado,
        ultima_compra,
        segmento
      };
    }));

    const filtrado = segmento && segmento !== 'todos'
      ? enriched.filter(u => u.segmento === segmento)
      : enriched;

    res.json({
      success: true,
      data: filtrado,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, rol: 'cliente' },
      attributes: ['id', 'nombre', 'email', 'activo', 'fecha_registro']
    });
    if (!user) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });

    const orders = await Order.findAll({
      where: { user_id: user.id },
      order: [['fecha', 'DESC']]
    });

    const total_gastado = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    let segmento = 'nuevo';
    if (orders.length >= 10 || total_gastado >= 5000) segmento = 'vip';
    else if (orders.length >= 3) segmento = 'recurrente';
    else if (orders.length === 0) segmento = 'inactivo';

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        total_ordenes: orders.length,
        total_gastado,
        ultima_compra: orders[0]?.fecha || null,
        segmento,
        ordenes: orders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const toggleActivo = async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, rol: 'cliente' } });
    if (!user) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    await user.update({ activo: !user.activo });
    res.json({ success: true, message: `Cliente ${user.activo ? 'activado' : 'desactivado'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getById, toggleActivo };