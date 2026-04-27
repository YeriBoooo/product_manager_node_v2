const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Verifica uno o más roles
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ error: `Acceso denegado. Se requiere: ${roles.join(' o ')}` });
  }
  next();
};

const requireAdmin      = requireRole('admin');
const requireVentas     = requireRole('admin', 'gerente_ventas');
const requireInventario = requireRole('admin', 'gerente_inventario');
const requireVendedor   = requireRole('admin', 'gerente_ventas', 'vendedor');

module.exports = { authenticate, requireRole, requireAdmin, requireVentas, requireInventario, requireVendedor };