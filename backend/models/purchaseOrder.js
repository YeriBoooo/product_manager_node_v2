const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numero_orden: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'enviada', 'parcial', 'recibida', 'cancelada'),
    defaultValue: 'borrador',
    allowNull: false
  },
  fecha_esperada: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  fecha_recepcion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  impuesto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'purchase_orders',
  timestamps: true
});

module.exports = PurchaseOrder;