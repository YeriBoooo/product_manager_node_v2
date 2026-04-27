const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  ruc: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  contacto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: { isEmail: true }
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pais: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Perú'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'suppliers',
  timestamps: true
});

module.exports = Supplier;