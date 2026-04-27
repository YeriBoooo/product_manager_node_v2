const { Op }           = require('sequelize');
const { sequelize }    = require('../config/database');
const StockReservation = require('../models/stockReservation');
const Product          = require('../models/product');

const TIMEOUT_MINUTOS = 15;

/* ─────────────────────────────────────────────
   Liberar reservas expiradas (llamado por cron)
───────────────────────────────────────────── */
const liberarReservasExpiradas = async () => {
  try {
    const expiradas = await StockReservation.findAll({
      where: {
        estado:    'activa',
        expira_en: { [Op.lt]: new Date() },
      },
    });

    for (const reserva of expiradas) {
      const product = await Product.findByPk(reserva.product_id);
      if (!product) {
        await reserva.update({ estado: 'liberada' });
        console.warn(`⚠️  Reserva ${reserva.id} sin producto asociado — marcada liberada`);
        continue;
      }
      await product.increment('stock_actual', { by: reserva.cantidad });
      await reserva.update({ estado: 'liberada' });
      console.log(`🔓 Reserva liberada — Producto: ${reserva.product_id}, Cantidad: ${reserva.cantidad}`);
    }

    if (expiradas.length > 0) {
      console.log(`✅ ${expiradas.length} reservas expiradas liberadas`);
    }
  } catch (err) {
    console.error('❌ Error liberando reservas:', err.message);
  }
};

/* ─────────────────────────────────────────────
   Liberar reservas activas de un usuario
   — SIN include para evitar FOR UPDATE + LEFT JOIN
   — acepta transacción opcional
───────────────────────────────────────────── */
const liberarReservasUsuario = async (userId, t = null) => {
  const queryOpts = t
    ? { transaction: t, lock: t.LOCK.UPDATE }  // lock solo sobre StockReservation, sin include ✅
    : {};

  // ✅ Sin include: buscamos reservas sin join
  const reservas = await StockReservation.findAll({
    where: { user_id: userId, estado: 'activa' },
    ...queryOpts,
  });

  for (const reserva of reservas) {
    // Cargamos el producto por separado (fuera del lock join)
    const product = await Product.findByPk(
      reserva.product_id,
      t ? { transaction: t } : {}
    );

    if (!product) {
      await reserva.update({ estado: 'liberada' }, t ? { transaction: t } : {});
      continue;
    }

    await product.increment('stock_actual', {
      by: reserva.cantidad,
      ...(t ? { transaction: t } : {}),
    });
    await reserva.update({ estado: 'liberada' }, t ? { transaction: t } : {});
  }
};

/* ─────────────────────────────────────────────
   Reservar stock al iniciar checkout
───────────────────────────────────────────── */
const reservarStock = async (userId, items) => {
  // Limpieza previa sin transacción
  await liberarReservasExpiradas();

  const t = await sequelize.transaction();

  try {
    // Liberar reservas activas previas del usuario
    await liberarReservasUsuario(userId, t);

    const expira_en = new Date(Date.now() + TIMEOUT_MINUTOS * 60 * 1000);
    const errores   = [];

    for (const item of items) {
      const productId = item.product_id || item.id;

      // ✅ findByPk con lock — sin include, no hay join
      const product = await Product.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!product) {
        errores.push(`Producto ${productId} no encontrado`);
        continue;
      }

      if (product.stock_actual < item.cantidad) {
        errores.push(
          `Stock insuficiente para "${product.nombre}": disponible ${product.stock_actual}, solicitado ${item.cantidad}`
        );
        continue;
      }

      await product.decrement('stock_actual', { by: item.cantidad, transaction: t });
      await StockReservation.create(
        {
          user_id:    userId,
          product_id: product.id,
          cantidad:   item.cantidad,
          expira_en,
          estado:     'activa',
        },
        { transaction: t }
      );
    }

    if (errores.length > 0) {
      await t.rollback();
      throw new Error(errores.join(' | '));
    }

    await t.commit();
    return { expira_en, minutos: TIMEOUT_MINUTOS };

  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
};

/* ─────────────────────────────────────────────
   Confirmar reservas al completar checkout
───────────────────────────────────────────── */
const confirmarReservas = async (userId) => {
  const actualizadas = await StockReservation.update(
    { estado: 'confirmada' },
    { where: { user_id: userId, estado: 'activa' } }
  );

  if (actualizadas[0] === 0) {
    console.warn(`⚠️  confirmarReservas: ninguna reserva activa para user ${userId} — ¿ya expiró?`);
  }
};

module.exports = {
  reservarStock,
  liberarReservasUsuario,
  confirmarReservas,
  liberarReservasExpiradas,
};