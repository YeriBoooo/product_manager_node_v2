const Supplier = require('../models/supplier');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = { activo: true };

    if (search) {
      where[Op.or] = [
        { nombre:   { [Op.iLike]: `%${search}%` } },
        { ruc:      { [Op.iLike]: `%${search}%` } },
        { contacto: { [Op.iLike]: `%${search}%` } },
        { email:    { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Supplier.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, ruc, contacto, email, telefono, direccion, ciudad, pais, notas } = req.body;

    if (!nombre) return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });

    const supplier = await Supplier.create({
      nombre, ruc, contacto, email, telefono, direccion, ciudad, pais, notas
    });

    res.status(201).json({ success: true, data: supplier, message: 'Proveedor creado exitosamente' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'El RUC ya está registrado' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });

    await supplier.update(req.body);
    res.json({ success: true, data: supplier, message: 'Proveedor actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });

    // Soft delete
    await supplier.update({ activo: false });
    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };