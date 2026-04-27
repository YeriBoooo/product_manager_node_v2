const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'cliente',
    validate: {
      isIn: [['admin', 'gerente_ventas', 'gerente_inventario', 'vendedor', 'cliente', 'invitado']]
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;