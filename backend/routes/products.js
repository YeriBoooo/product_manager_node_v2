const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate, requireAdmin, requireInventario } = require('../utils/authMiddleware');

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
   RUTAS CON SWAGGER
======================== */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener lista de productos
 *     description: Retorna todos los productos con opciones de paginación y filtrado
 *     tags:
 *       - Productos
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de productos por página
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de página
 *       - name: categoria
 *         in: query
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *       500:
 *         description: Error al obtener productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/products', productController.getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     description: Retorna los detalles completos de un producto específico
 *     tags:
 *       - Productos
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *         example: 1
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al obtener producto
 */
router.get('/products/:id', productController.getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear nuevo producto
 *     description: Crea un nuevo producto en el sistema (solo admin/gerente inventario)
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - nombre
 *               - categoria
 *               - precio_compra
 *               - precio_venta
 *               - stock_actual
 *               - stock_minimo
 *               - proveedor
 *             properties:
 *               sku:
 *                 type: string
 *                 example: P001
 *               nombre:
 *                 type: string
 *                 example: Laptop Dell XPS
 *               descripcion:
 *                 type: string
 *                 example: Laptop de alto rendimiento para profesionales
 *               categoria:
 *                 type: string
 *                 example: Tecnología
 *               precio_compra:
 *                 type: number
 *                 format: float
 *                 example: 800.00
 *               precio_venta:
 *                 type: number
 *                 format: float
 *                 example: 1200.00
 *               stock_actual:
 *                 type: integer
 *                 example: 10
 *               stock_minimo:
 *                 type: integer
 *                 example: 5
 *               proveedor:
 *                 type: string
 *                 example: Dell Inc
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Datos inválidos o SKU duplicado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado - Se requiere rol admin o gerente inventario
 *       500:
 *         description: Error al crear producto
 */
router.post('/products', authenticate, requireInventario, validateProduct, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar producto
 *     description: Actualiza los datos de un producto existente
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               categoria:
 *                 type: string
 *               precio_compra:
 *                 type: number
 *               precio_venta:
 *                 type: number
 *               stock_actual:
 *                 type: integer
 *               stock_minimo:
 *                 type: integer
 *               proveedor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al actualizar
 */
router.put('/products/:id', authenticate, requireInventario, validateProduct, productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     description: Elimina un producto del sistema (solo admin/gerente inventario)
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al eliminar
 */
router.delete('/products/:id', authenticate, requireInventario, productController.deleteProduct);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas del dashboard
 *     description: Retorna estadísticas de productos, ventas y stock para el dashboard
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProductos:
 *                   type: integer
 *                 totalVentas:
 *                   type: number
 *                 productosActivos:
 *                   type: integer
 *                 productosBajoStock:
 *                   type: integer
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error al obtener estadísticas
 */
router.get('/dashboard/stats', authenticate, productController.getDashboardStats);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Obtener lista de categorías
 *     description: Retorna todas las categorías disponibles de productos
 *     tags:
 *       - Categorías
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Error al obtener categorías
 */
router.get('/categories', productController.getCategories);

module.exports = router;