const AuditLog = require('../models/auditLog');

const registrar = async ({ user_id, user_email, user_rol, accion, entidad, entidad_id, detalle, ip }) => {
  try {
    await AuditLog.create({
      user_id:    user_id   || null,
      user_email: user_email || null,
      user_rol:   user_rol  || null,
      accion,
      entidad:    entidad    || null,
      entidad_id: entidad_id || null,
      detalle:    detalle ? JSON.stringify(detalle) : null,
      ip:         ip || null,
    });
  } catch (err) {
    // La auditoría nunca debe romper el flujo principal
    console.error('[auditService] Error registrando auditoría:', err.message);
  }
};

module.exports = { registrar };