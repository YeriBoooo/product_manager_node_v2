const AuditLog = require('../models/auditLog');
const { Op } = require('sequelize');

const getLogs = async (req, res) => {
  try {
    const { accion, user_email, page = 1, limit = 50 } = req.query;
    const where = {};

    if (accion)      where.accion      = accion;
    if (user_email)  where.user_email  = { [Op.iLike]: `%${user_email}%` };

    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['fecha', 'DESC']],
      limit:  parseInt(limit),
      offset,
    });

    return res.status(200).json({
      success: true,
      total: count,
      page:  parseInt(page),
      data:  rows,
    });
  } catch (error) {
    console.error('[auditController] getLogs:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLogs };