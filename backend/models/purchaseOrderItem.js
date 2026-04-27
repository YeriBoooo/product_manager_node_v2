const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  purchase_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cantidad_pedida: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cantidad_recibida: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'purchase_order_items',
  timestamps: true
});

module.exports = PurchaseOrderItem;