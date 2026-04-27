const statsService = require('../services/statsService');

const getAllStats = async (req, res) => {
  try {
    const data = await statsService.getAllStats();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[statsController] getAllStats:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getABC = async (req, res) => {
  try {
    const data = await statsService.getAnalisisABC();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getRFM = async (req, res) => {
  try {
    const data = await statsService.getAnalisisRFM();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getTendencia = async (req, res) => {
  try {
    const data = await statsService.getTendenciaVentas();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAbandono = async (req, res) => {
  try {
    const data = await statsService.getTasaAbandono();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllStats, getABC, getRFM, getTendencia, getAbandono };