const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Cart = sequelize.define('Cart', {
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
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'activo',
    validate: { isIn: [['activo', 'finalizado']] }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'carts',
  timestamps: false
});

Cart.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Cart;