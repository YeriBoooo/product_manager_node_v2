const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User    = require('./user');
const Product = require('./product');

const Review = sequelize.define('Review', {
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
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'reviews',
  timestamps: false,
});

Review.belongsTo(User,    { foreignKey: 'user_id' });
Review.belongsTo(Product, { foreignKey: 'product_id' });
User.hasMany(Review,      { foreignKey: 'user_id' });
Product.hasMany(Review,   { foreignKey: 'product_id' });

module.exports = Review;