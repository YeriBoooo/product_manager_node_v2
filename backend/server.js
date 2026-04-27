const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');

const productRoutes = require('./routes/products');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboardRoutes');
const supplierRoutes = require('./routes/suppliers');
const clientRoutes = require('./routes/clients');
const statsRoutes = require('./routes/stats');
const auditRoutes = require('./routes/audit');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlists');
const stockRoutes = require('./routes/stockReservations');
const purchaseOrderRoutes = require('./routes/purchaseOrders');

const { liberarReservasExpiradas } = require('./services/stockReservationService');

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS
========================= */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app');

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* =========================
   SECURITY
========================= */
app.use(helmet());

/* =========================
   RATE LIMIT
========================= */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* =========================
   BODY
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   SWAGGER (opcional)
========================= */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'API', version: '1.0.0' }
  },
  apis: ['./routes/*.js']
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================
   ROUTES
========================= */
app.use('/api', productRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/* =========================
   START
========================= */
const startServer = async () => {
  try {
    await testConnection();
    console.log('✅ Neon conectado');

    const isProd = process.env.NODE_ENV === 'production';
    await sequelize.sync({ alter: !isProd });

    setInterval(liberarReservasExpiradas, 60 * 1000);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error server:', error);
    process.exit(1);
  }
};

startServer();