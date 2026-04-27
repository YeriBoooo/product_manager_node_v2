const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // null si es login fallido
  },
  user_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  user_rol: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  accion: {
    type: DataTypes.STRING(50),
    allowNull: false,
    // Valores: LOGIN_OK, LOGIN_FAIL, PRODUCT_CREATE, PRODUCT_UPDATE,
    //          PRODUCT_DELETE, ORDER_STATUS_CHANGE, LOGOUT
  },
  entidad: {
    type: DataTypes.STRING(50),
    allowNull: true, // 'product', 'order', 'user'
  },
  entidad_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  detalle: {
    type: DataTypes.TEXT,
    allowNull: true, // JSON con info adicional
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
});

module.exports = AuditLog;