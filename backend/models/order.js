const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },

  // ── Campos nuevos para el checkout ──────────────
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  shipping_method: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  payment_method: {
    type: DataTypes.STRING(30),
    allowNull: true
  },

  // ── Dirección de envío ───────────────────────────
  shipping_address_nombre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_address_email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_address_telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  shipping_address_direccion: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  shipping_address_ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_address_departamento: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_address_codigo_postal: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  // ── Estado con todos los valores válidos ─────────
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'pendiente',
    validate: {
      isIn: [[
        'pendiente',
        'pendiente_pago',   // ← agregado para el checkout
        'pagada',
        'en_proceso',
        'enviada',
        'entregada',
        'cancelada'
      ]]
    }
  },

  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'orders',
  timestamps: false
});

Order.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Order;