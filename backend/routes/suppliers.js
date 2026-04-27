const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/supplierController');
const { authenticate, requireInventario } = require('../utils/authMiddleware');

router.get('/',     authenticate, requireInventario, getAll);
router.get('/:id',  authenticate, requireInventario, getById);
router.post('/',    authenticate, requireInventario, create);
router.put('/:id',  authenticate, requireInventario, update);
router.delete('/:id', authenticate, requireInventario, remove);

module.exports = router;