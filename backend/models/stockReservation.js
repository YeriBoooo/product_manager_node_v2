const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Product = require('./product');
const User = require('./user');

const StockReservation = sequelize.define('StockReservation', {
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
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Product, key: 'id' }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expira_en: {
    type: DataTypes.DATE,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'activa',
    validate: { isIn: [['activa', 'liberada', 'confirmada']] }
  }
}, {
  tableName: 'stock_reservations',
  timestamps: true
});

StockReservation.belongsTo(Product, { foreignKey: 'product_id' });
StockReservation.belongsTo(User,    { foreignKey: 'user_id' });

module.exports = StockReservation;