const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/user');
const audit  = require('../services/auditService');

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email ya registrado' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ nombre, email, password_hash, rol: rol || 'cliente' });
    res.status(201).json({ message: 'Usuario creado', user: { id: user.id, email: user.email, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = getIP(req);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      await audit.registrar({ accion: 'LOGIN_FAIL', user_email: email, detalle: { motivo: 'Usuario no existe' }, ip });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await audit.registrar({ accion: 'LOGIN_FAIL', user_email: email, user_id: user.id, detalle: { motivo: 'Contraseña incorrecta' }, ip });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      await audit.registrar({ accion: 'LOGIN_FAIL', user_email: email, user_id: user.id, detalle: { motivo: 'Usuario inactivo' }, ip });
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refresh_token: refreshToken });

    await audit.registrar({ accion: 'LOGIN_OK', user_id: user.id, user_email: user.email, user_rol: user.rol, ip });

    res.json({ accessToken, refreshToken, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
    const user = await User.findByPk(payload.id);
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token no reconocido' });
    }
    if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo' });
    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });
    const payload = jwt.decode(refreshToken);
    if (payload?.id) {
      const user = await User.findByPk(payload.id);
      if (user) {
        await audit.registrar({ accion: 'LOGOUT', user_id: user.id, user_email: user.email, user_rol: user.rol, ip: getIP(req) });
        await user.update({ refresh_token: null });
      }
    }
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'fecha_registro']
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePerfil = async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    await user.update({ nombre, email });
    res.json({ success: true, message: 'Perfil actualizado', data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(password_actual, user.password_hash);
    if (!valid) return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 10);
    await user.update({ password_hash: hash });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { register, login, refresh, logout, getMe, updatePerfil, cambiarPassword };