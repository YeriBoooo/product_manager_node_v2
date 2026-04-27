const express = require('express');
const router  = express.Router();
const { getAllStats, getABC, getRFM, getTendencia, getAbandono } = require('../controllers/statsController');
const { authenticate, requireVentas } = require('../utils/authMiddleware');

// Todas las rutas requieren auth + rol ventas/admin
router.get('/',          authenticate, requireVentas, getAllStats);
router.get('/abc',       authenticate, requireVentas, getABC);
router.get('/rfm',       authenticate, requireVentas, getRFM);
router.get('/tendencia', authenticate, requireVentas, getTendencia);
router.get('/abandono',  authenticate, requireVentas, getAbandono);

module.exports = router;