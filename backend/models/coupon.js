const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { isUppercase: true }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo_descuento: {
    type: DataTypes.ENUM('porcentaje', 'fijo'),
    allowNull: false,
    defaultValue: 'porcentaje'
  },
  valor_descuento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  monto_minimo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  usos_maximos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  usos_actuales: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATE,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'coupons',
  timestamps: false
});

module.exports = Coupon;