const express = require('express');
const router = express.Router();
const { validateCoupon, useCoupon, createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { authenticate, requireAdmin } = require('../utils/authMiddleware');

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validar cupón
 *     description: Valida un código de cupón y calcula el descuento (sin usar el cupón)
 *     tags:
 *       - Cupones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - monto
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: DESCUENTO10
 *               monto:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       200:
 *         description: Cupón válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valido:
 *                   type: boolean
 *                 codigo:
 *                   type: string
 *                 descripcion:
 *                   type: string
 *                 tipo_descuento:
 *                   type: string
 *                   enum: ['porcentaje', 'fijo']
 *                 valor_descuento:
 *                   type: number
 *                 descuento:
 *                   type: number
 *                 monto_original:
 *                   type: number
 *                 monto_final:
 *                   type: number
 *                 ahorro:
 *                   type: number
 *       400:
 *         description: Cupón inválido o expirado
 *       404:
 *         description: Cupón no encontrado
 */
router.post('/validate', validateCoupon);

/**
 * @swagger
 * /api/coupons/use:
 *   post:
 *     summary: Usar cupón
 *     description: Marca un cupón como usado (incrementa contador de usos)
 *     tags:
 *       - Cupones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: DESCUENTO10
 *     responses:
 *       200:
 *         description: Cupón utilizado correctamente
 *       404:
 *         description: Cupón no encontrado
 */
router.post('/use', authenticate, useCoupon);

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Crear cupón
 *     description: Crea un nuevo cupón de descuento (solo admin)
 *     tags:
 *       - Cupones - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - tipo_descuento
 *               - valor_descuento
 *               - fecha_inicio
 *               - fecha_fin
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: DESCUENTO10
 *               descripcion:
 *                 type: string
 *                 example: Descuento de 10% en productos seleccionados
 *               tipo_descuento:
 *                 type: string
 *                 enum: ['porcentaje', 'fijo']
 *               valor_descuento:
 *                 type: number
 *                 example: 10
 *               monto_minimo:
 *                 type: number
 *                 example: 50.00
 *               usos_maximos:
 *                 type: integer
 *                 example: 100
 *               fecha_inicio:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-04-24T00:00:00Z
 *               fecha_fin:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-31T23:59:59Z
 *     responses:
 *       201:
 *         description: Cupón creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post('/', authenticate, requireAdmin, createCoupon);

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Listar cupones
 *     description: Retorna todos los cupones (solo admin)
 *     tags:
 *       - Cupones - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: activo
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Lista de cupones
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/', authenticate, requireAdmin, getAllCoupons);

/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Obtener cupón
 *     description: Obtiene los detalles de un cupón específico (solo admin)
 *     tags:
 *       - Cupones - Admin
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
 *         description: Cupón encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Cupón no encontrado
 */
router.get('/:id', authenticate, requireAdmin, getCouponById);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Actualizar cupón
 *     description: Actualiza los datos de un cupón (solo admin)
 *     tags:
 *       - Cupones - Admin
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
 *               descripcion:
 *                 type: string
 *               valor_descuento:
 *                 type: number
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cupón actualizado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Cupón no encontrado
 */
router.put('/:id', authenticate, requireAdmin, updateCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Eliminar cupón
 *     description: Elimina un cupón (solo admin)
 *     tags:
 *       - Cupones - Admin
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
 *         description: Cupón eliminado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Cupón no encontrado
 */
router.delete('/:id', authenticate, requireAdmin, deleteCoupon);

module.exports = router;