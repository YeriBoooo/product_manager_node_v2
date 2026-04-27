const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('🔍 DATABASE_URL existe:', !!process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Neon database connected successfully');
  } catch (error) {
    console.error('❌ Unable to connect to Neon:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };