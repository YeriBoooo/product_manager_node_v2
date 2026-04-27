const express = require('express');
const router  = express.Router();
const { getLogs } = require('../controllers/auditController');
const { authenticate, requireVentas } = require('../utils/authMiddleware');

// Solo admin puede ver los logs de auditoría
// GET /api/audit?page=1&limit=50&accion=LOGIN&user_email=admin@...
router.get('/', authenticate, requireVentas, getLogs);

module.exports = router;