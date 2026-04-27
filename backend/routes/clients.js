const express = require('express');
const router = express.Router();
const { getAll, getById, toggleActivo } = require('../controllers/clientController');
const { authenticate, requireVentas } = require('../utils/authMiddleware');

router.get('/',           authenticate, requireVentas, getAll);
router.get('/:id',        authenticate, requireVentas, getById);
router.patch('/:id/toggle', authenticate, requireVentas, toggleActivo);

module.exports = router;