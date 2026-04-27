const express = require('express');
const router  = express.Router();
const {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  downloadFactura,
} = require('../controllers/orderController');

const { authenticate, requireVentas, requireVendedor } = require('../utils/authMiddleware');

/* ═══════════════════════════════════════════════
   CLIENTE — solo sus propias órdenes
═══════════════════════════════════════════════ */

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Obtener mis órdenes
 *     tags: [Órdenes - Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Órdenes obtenidas exitosamente
 *       401:
 *         description: No autenticado
 */
router.get('/my', authenticate, getMyOrders);

/**
 * @swagger
 * /api/orders/my/{id}:
 *   get:
 *     summary: Obtener detalle de mi orden
 *     tags: [Órdenes - Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de orden obtenido
 *       404:
 *         description: Orden no encontrada
 */
router.get('/my/:id', authenticate, getMyOrderById);

/**
 * @swagger
 * /api/orders/my/{id}/factura:
 *   get:
 *     summary: Descargar factura PDF de mi orden
 *     tags: [Órdenes - Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Orden no encontrada
 */
router.get('/my/:id/factura', authenticate, downloadFactura);

/**
 * @swagger
 * /api/orders/my/{id}/cancel:
 *   patch:
 *     summary: Cancelar mi orden
 *     tags: [Órdenes - Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden cancelada exitosamente
 *       400:
 *         description: No se puede cancelar
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/my/:id/cancel', authenticate, cancelMyOrder);

/* ═══════════════════════════════════════════════
   ADMIN / VENDEDOR — todas las órdenes
═══════════════════════════════════════════════ */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Obtener todas las órdenes
 *     tags: [Órdenes - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: estado
 *         in: query
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Órdenes obtenidas exitosamente
 *       403:
 *         description: No autorizado
 */
router.get('/', authenticate, requireVendedor, getAllOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener detalle de orden
 *     tags: [Órdenes - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden obtenida exitosamente
 *       404:
 *         description: Orden no encontrada
 */
router.get('/:id', authenticate, requireVendedor, getOrderById);

/**
 * @swagger
 * /api/orders/{id}/estado:
 *   patch:
 *     summary: Actualizar estado de orden
 *     tags: [Órdenes - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, pagada, en_proceso, enviada, entregada, cancelada]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Transición de estado no válida
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/estado', authenticate, requireVentas, updateOrderStatus);

module.exports = router;