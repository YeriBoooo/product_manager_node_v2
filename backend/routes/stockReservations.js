const express = require('express');
const router  = express.Router();
const { authenticate } = require('../utils/authMiddleware');
const reservationService = require('../services/stockReservationService');

// POST /api/stock/reservar — reservar stock al iniciar checkout
router.post('/reservar', authenticate, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay items para reservar' });
    }
    const result = await reservationService.reservarStock(req.user.id, items);
    res.json({
      success: true,
      message: `Stock reservado por ${result.minutos} minutos`,
      expira_en: result.expira_en
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/stock/liberar — liberar reservas manualmente
router.delete('/liberar', authenticate, async (req, res) => {
  try {
    await reservationService.liberarReservasUsuario(req.user.id);
    res.json({ success: true, message: 'Reservas liberadas' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;