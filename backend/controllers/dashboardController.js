const { getDashboardData } = require('../services/dashboardService');

const getDashboardStats = async (req, res) => {
  console.log('🎯 DASHBOARD HIT - usuario:', req.user?.email);
  try {
    const data = await getDashboardData();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[dashboardController] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del dashboard',
      error: error.message,
    });
  }
};

module.exports = { getDashboardStats };