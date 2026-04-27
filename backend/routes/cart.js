const express = require('express');
const router = express.Router();
const { getCart, addItem, removeItem, checkout } = require('../controllers/cartController');
const { authenticate } = require('../utils/authMiddleware');
const { reservarStock, liberarReserva } = require('../controllers/cartController');

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Obtener carrito del usuario
 *     description: Retorna el carrito activo del usuario autenticado con todos sus items
 *     tags:
 *       - Carrito
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carrito obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 user_id:
 *                   type: integer
 *                 estado:
 *                   type: string
 *                   enum: ['activo', 'finalizado']
 *                 CartItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       product_id:
 *                         type: integer
 *                       cantidad:
 *                         type: integer
 *                       precio_unitario:
 *                         type: number
 *       401:
 *         description: No autenticado - Token requerido
 *       500:
 *         description: Error al obtener carrito
 */
router.get('/', authenticate, getCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Agregar producto al carrito
 *     description: Agrega un producto al carrito del usuario. Si el producto ya existe, aumenta la cantidad
 *     tags:
 *       - Carrito
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - cantidad
 *             properties:
 *               product_id:
 *                 type: integer
 *                 example: 1
 *               cantidad:
 *                 type: integer
 *                 example: 2
 *           examples:
 *             addItem:
 *               value:
 *                 product_id: 1
 *                 cantidad: 2
 *     responses:
 *       201:
 *         description: Producto agregado al carrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 cart_id:
 *                   type: integer
 *                 product_id:
 *                   type: integer
 *                 cantidad:
 *                   type: integer
 *                 precio_unitario:
 *                   type: number
 *       400:
 *         description: Stock insuficiente o producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: No autenticado - Token requerido
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al agregar producto
 */
router.post('/items', authenticate, addItem);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   delete:
 *     summary: Eliminar item del carrito
 *     description: Elimina un producto del carrito del usuario
 *     tags:
 *       - Carrito
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item del carrito a eliminar
 *         example: 5
 *     responses:
 *       200:
 *         description: Item eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item eliminado
 *       401:
 *         description: No autenticado - Token requerido
 *       404:
 *         description: Item no encontrado
 *       500:
 *         description: Error al eliminar item
 */
router.delete('/items/:id', authenticate, removeItem);

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Procesar checkout y crear orden
 *     description: Convierte el carrito en una orden, valida datos de envío y pago, descuenta stock y cierra el carrito
 *     tags:
 *       - Carrito
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - shippingMethod
 *               - paymentMethod
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - nombre
 *                   - email
 *                   - telefono
 *                   - direccion
 *                   - ciudad
 *                   - departamento
 *                   - codigoPostal
 *                 properties:
 *                   nombre:
 *                     type: string
 *                     example: Juan Pérez
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: juan@example.com
 *                   telefono:
 *                     type: string
 *                     example: +51987654321
 *                   direccion:
 *                     type: string
 *                     example: Calle Principal 123
 *                   ciudad:
 *                     type: string
 *                     example: Trujillo
 *                   departamento:
 *                     type: string
 *                     example: La Libertad
 *                   codigoPostal:
 *                     type: string
 *                     example: 13000
 *               shippingMethod:
 *                 type: string
 *                 enum: ['standard', 'express', 'pickup']
 *                 example: standard
 *               paymentMethod:
 *                 type: string
 *                 enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery']
 *                 example: cash_on_delivery
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   cardNumber:
 *                     type: string
 *                     example: 4111111111111111
 *                   expiryMonth:
 *                     type: integer
 *                     example: 12
 *                   expiryYear:
 *                     type: integer
 *                     example: 2026
 *                   cvv:
 *                     type: string
 *                     example: 123
 *                   cardholderName:
 *                     type: string
 *                     example: JUAN PEREZ
 *           examples:
 *             cashOnDelivery:
 *               value:
 *                 shippingAddress:
 *                   nombre: Juan Pérez
 *                   email: juan@example.com
 *                   telefono: +51987654321
 *                   direccion: Calle Principal 123
 *                   ciudad: Trujillo
 *                   departamento: La Libertad
 *                   codigoPostal: 13000
 *                 shippingMethod: standard
 *                 paymentMethod: cash_on_delivery
 *             creditCard:
 *               value:
 *                 shippingAddress:
 *                   nombre: Juan Pérez
 *                   email: juan@example.com
 *                   telefono: +51987654321
 *                   direccion: Calle Principal 123
 *                   ciudad: Trujillo
 *                   departamento: La Libertad
 *                   codigoPostal: 13000
 *                 shippingMethod: express
 *                 paymentMethod: credit_card
 *                 paymentDetails:
 *                   cardNumber: 4111111111111111
 *                   expiryMonth: 12
 *                   expiryYear: 2026
 *                   cvv: 123
 *                   cardholderName: JUAN PEREZ
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pedido creado exitosamente
 *                 order_id:
 *                   type: integer
 *                   example: 2
 *                 order_number:
 *                   type: integer
 *                   example: 2
 *                 subtotal:
 *                   type: number
 *                   example: 1420
 *                 shippingCost:
 *                   type: number
 *                   example: 10
 *                 total:
 *                   type: number
 *                   example: 1430
 *                 shippingAddress:
 *                   type: object
 *                 items:
 *                   type: array
 *       400:
 *         description: Validación fallida - Carrito vacío o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *       401:
 *         description: No autenticado - Token requerido
 *       500:
 *         description: Error al procesar checkout
 */
router.post('/checkout', authenticate, checkout);
router.post('/reservar-stock', authenticate, reservarStock);
router.delete('/reservar-stock', authenticate, liberarReserva);
module.exports = router;