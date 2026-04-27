const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Cart = require('./cart');
const Product = require('./product');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  cart_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Cart, key: 'id' }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Product, key: 'id' }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'cart_items',
  timestamps: false
});

CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });
CartItem.belongsTo(Product, { foreignKey: 'product_id' });
Cart.hasMany(CartItem, { foreignKey: 'cart_id' });

module.exports = CartItem;