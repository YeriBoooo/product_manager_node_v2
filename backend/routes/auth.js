const express = require('express');
const router  = express.Router();
const { register, login, refresh, logout, getMe, updatePerfil, cambiarPassword } = require('../controllers/authController');
const { authenticate } = require('../utils/authMiddleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *               - rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               rol:
 *                 type: string
 *                 enum: ['cliente', 'admin', 'gerente_ventas', 'gerente_inventario', 'vendedor', 'invitado']
 *                 example: cliente
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                     rol:
 *                       type: string
 *       400:
 *         description: Email ya registrado o datos inválidos
 *       500:
 *         description: Error al registrar usuario
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y retorna tokens JWT
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT token para autenticación
 *                 refreshToken:
 *                   type: string
 *                   description: Token para renovar el accessToken
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                     rol:
 *                       type: string
 *       400:
 *         description: Email o contraseña incorrectos
 *       500:
 *         description: Error al iniciar sesión
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     description: Genera un nuevo accessToken usando el refreshToken
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error al renovar token
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Invalida los tokens del usuario
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *       500:
 *         description: Error al cerrar sesión
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener datos del usuario autenticado
 *     description: Retorna la información del usuario actualmente autenticado
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 email:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 activo:
 *                   type: boolean
 *       401:
 *         description: No autenticado - Token requerido
 *       500:
 *         description: Error al obtener datos
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/perfil:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     description: Actualiza los datos del perfil del usuario autenticado
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Email ya existe o datos inválidos
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error al actualizar perfil
 */
router.put('/perfil', authenticate, updatePerfil);

/**
 * @swagger
 * /api/auth/cambiar-password:
 *   put:
 *     summary: Cambiar contraseña
 *     description: Cambia la contraseña del usuario autenticado
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordActual
 *               - passwordNueva
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               passwordNueva:
 *                 type: string
 *                 format: password
 *                 example: newpassword456
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Contraseña actual incorrecta o nueva contraseña inválida
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error al cambiar contraseña
 */
router.put('/cambiar-password', authenticate, cambiarPassword);

module.exports = router;