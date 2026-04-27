const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User    = require('./user');
const Product = require('./product');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Product, key: 'id' },
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'wishlists',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['user_id', 'product_id'] }
  ],
});

Wishlist.belongsTo(User,    { foreignKey: 'user_id' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = Wishlist;