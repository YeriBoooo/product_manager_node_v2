const express = require('express');
const router  = express.Router();
const {
  getAll, getById, create, updateEstado, recibirMercaderia, cancel
} = require('../controllers/purchaseOrderController');
const { authenticate, requireInventario } = require('../utils/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Órdenes de Compra
 *   description: Gestión de órdenes de compra a proveedores
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Listar órdenes de compra
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [borrador, enviada, parcial, recibida, cancelada]
 *       - in: query
 *         name: supplier_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de órdenes de compra
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.get('/', authenticate, requireInventario, getAll);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Detalle de una orden de compra
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la orden
 *       404:
 *         description: Orden no encontrada
 */
router.get('/:id', authenticate, requireInventario, getById);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Crear nueva orden de compra
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - items
 *             properties:
 *               supplier_id:
 *                 type: integer
 *                 example: 1
 *               fecha_esperada:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-10"
 *               notas:
 *                 type: string
 *                 example: "Pedido urgente"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - cantidad_pedida
 *                     - precio_unitario
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 49
 *                     cantidad_pedida:
 *                       type: integer
 *                       example: 10
 *                     precio_unitario:
 *                       type: number
 *                       example: 60.00
 *           examples:
 *             ejemplo:
 *               value:
 *                 supplier_id: 1
 *                 fecha_esperada: "2026-05-10"
 *                 notas: "Pedido urgente"
 *                 items:
 *                   - product_id: 49
 *                     cantidad_pedida: 10
 *                     precio_unitario: 60.00
 *                   - product_id: 50
 *                     cantidad_pedida: 5
 *                     precio_unitario: 25.00
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Proveedor o producto no encontrado
 */
router.post('/', authenticate, requireInventario, create);

/**
 * @swagger
 * /api/purchase-orders/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de la orden
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                 enum: [borrador, enviada, parcial, recibida, cancelada]
 *                 example: enviada
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/estado', authenticate, requireInventario, updateEstado);

/**
 * @swagger
 * /api/purchase-orders/{id}/recibir:
 *   post:
 *     summary: Registrar recepción de mercadería
 *     description: Actualiza el stock de los productos recibidos automáticamente
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     purchase_order_item_id:
 *                       type: integer
 *                       example: 1
 *                     cantidad_recibida:
 *                       type: integer
 *                       example: 10
 *           examples:
 *             ejemplo:
 *               value:
 *                 items:
 *                   - purchase_order_item_id: 1
 *                     cantidad_recibida: 10
 *                   - purchase_order_item_id: 2
 *                     cantidad_recibida: 5
 *     responses:
 *       200:
 *         description: Mercadería recibida y stock actualizado
 *       400:
 *         description: Orden cancelada o ya recibida
 *       404:
 *         description: Orden no encontrada
 */
router.post('/:id/recibir', authenticate, requireInventario, recibirMercaderia);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     summary: Cancelar orden de compra
 *     description: Solo se pueden cancelar órdenes en estado borrador
 *     tags: [Órdenes de Compra]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden cancelada
 *       400:
 *         description: Solo se pueden cancelar órdenes en borrador
 *       404:
 *         description: Orden no encontrada
 */
router.delete('/:id', authenticate, requireInventario, cancel);

module.exports = router;