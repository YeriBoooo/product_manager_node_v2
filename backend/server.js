const express = require('express'); // ✅ solo una vez
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

/* ========================
   MIDDLEWARES
======================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========================
   RUTA BASE (para probar)
======================== */
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API funcionando correctamente',
    endpoints: {
      products: '/api/products'
    }
  });
});

/* ========================
   ROUTES
======================== */
app.use('/api', productRoutes);

/* ========================
   ERROR HANDLER
======================== */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

/* ========================
   START SERVER
======================== */
const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });

    console.log('✅ Database synchronized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
  }
};

startServer();