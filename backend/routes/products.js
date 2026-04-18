const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const productController = require('../controllers/productController');

/* ========================
   VALIDACIÓN
======================== */
const validateProduct = [
  body('sku').notEmpty().isLength({ min: 3, max: 50 }),
  body('nombre').notEmpty().isLength({ min: 2, max: 100 }),
  body('categoria').notEmpty(),
  body('precio_compra').isFloat({ min: 0 }),
  body('precio_venta').isFloat({ min: 0 }),
  body('stock_actual').isInt({ min: 0 }),
  body('stock_minimo').isInt({ min: 0 }),
  body('proveedor').notEmpty(),

  // 🔥 Manejo de errores (IMPORTANTE)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/* ========================
   RUTAS
======================== */
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', validateProduct, productController.createProduct);
router.put('/products/:id', validateProduct, productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

router.get('/dashboard/stats', productController.getDashboardStats);
router.get('/categories', productController.getCategories);

module.exports = router;