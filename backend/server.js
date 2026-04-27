const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const swaggerUi    = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const productRoutes       = require('./routes/products');
const reportRoutes        = require('./routes/reports');
const authRoutes          = require('./routes/auth');
const cartRoutes          = require('./routes/cart');
const orderRoutes         = require('./routes/orders');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const supplierRoutes      = require('./routes/suppliers');
const clientRoutes        = require('./routes/clients');
const statsRoutes         = require('./routes/stats');
const auditRoutes         = require('./routes/audit');
const reviewRoutes        = require('./routes/reviews');
const wishlistRoutes      = require('./routes/wishlists');
const stockRoutes         = require('./routes/stockReservations');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const { liberarReservasExpiradas } = require('./services/stockReservationService');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ══════════════════════════════════════════
   1. CORS MANUAL — ABSOLUTAMENTE PRIMERO
   Antes de helmet, rate-limit y cualquier otra cosa.
   Esto garantiza que los preflight OPTIONS siempre respondan.
══════════════════════════════════════════ */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',      'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods',     'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers',     'Content-Type, Authorization, X-Requested-With');

  // Responde el preflight OPTIONS de inmediato sin pasar por nada más
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/* ══════════════════════════════════════════
   2. HELMET
══════════════════════════════════════════ */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/* ══════════════════════════════════════════
   3. RATE LIMITING
══════════════════════════════════════════ */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { success: false, message: 'Demasiadas solicitudes, intenta en 15 minutos' },
  standardHeaders: true, legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Demasiados intentos de acceso, intenta en 15 minutos' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

/* ══════════════════════════════════════════
   4. BODY PARSERS
══════════════════════════════════════════ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ══════════════════════════════════════════
   5. SWAGGER
══════════════════════════════════════════ */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gestión de Productos API',
      version: '1.0.0',
      description: 'API REST para sistema de gestión de inventario, carrito de compras y órdenes',
      contact: { name: 'Soporte Técnico', email: 'soporte@tienda.com' }
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Servidor de desarrollo' },
      { url: 'https://api.tienda.com',   description: 'Servidor de producción' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, nombre: { type: 'string' }, sku: { type: 'string' },
            descripcion: { type: 'string' }, categoria: { type: 'string' },
            precio_compra: { type: 'number' }, precio_venta: { type: 'number' },
            stock_actual: { type: 'integer' }, stock_minimo: { type: 'integer' },
            proveedor: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, user_id: { type: 'integer' },
            total: { type: 'number' },
            estado: { type: 'string', enum: ['pendiente','pagada','en_proceso','enviada','entregada','cancelada'] },
            fecha: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, nombre: { type: 'string' },
            email: { type: 'string', format: 'email' },
            rol: { type: 'string', enum: ['cliente','admin','gerente_ventas','gerente_inventario','vendedor','invitado'] }
          }
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' }, message: { type: 'string' } }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gestión de Productos - API Docs'
}));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/* ══════════════════════════════════════════
   6. RUTA BASE
══════════════════════════════════════════ */
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API funcionando correctamente',
    documentation: '/api/docs',
    endpoints: {
      products:       '/api/products',
      reports:        '/api/reports',
      auth:           '/api/auth',
      cart:           '/api/cart',
      orders:         '/api/orders',
      dashboard:      '/api/dashboard',
      suppliers:      '/api/suppliers',
      clients:        '/api/clients',
      stats:          '/api/stats',
      audit:          '/api/audit',
      reviews:        '/api/reviews',
      wishlist:       '/api/wishlist',
      stock:          '/api/stock',
      purchaseOrders: '/api/purchase-orders',
    }
  });
});

/* ══════════════════════════════════════════
   7. RUTAS
══════════════════════════════════════════ */
app.use('/api',                 productRoutes);
app.use('/api/reports',         reportRoutes);
app.use('/api/auth',            authRoutes);
app.use('/api/cart',            cartRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/suppliers',       supplierRoutes);
app.use('/api/clients',         clientRoutes);
app.use('/api/stats',           statsRoutes);
app.use('/api/audit',           auditRoutes);
app.use('/api/reviews',         reviewRoutes);
app.use('/api/wishlist',        wishlistRoutes);
app.use('/api/stock',           stockRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

/* ══════════════════════════════════════════
   8. ERROR HANDLER GLOBAL
══════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message,
  });
});

/* ══════════════════════════════════════════
   9. EVITA QUE EL SERVIDOR CRASHEE SILENCIOSAMENTE
══════════════════════════════════════════ */
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rechazada:', reason);
});

/* ══════════════════════════════════════════
   10. START SERVER
══════════════════════════════════════════ */
const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');

    setInterval(liberarReservasExpiradas, 60 * 1000);
    console.log('⏰ Cron job de reservas iniciado (cada 60 segundos)');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();